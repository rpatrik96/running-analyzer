/**
 * Data processor for running metrics
 * Converts raw FIT records to analyzed running data
 */

import type {
  FITRecord,
  RunningDataPoint,
  AnalysisResult,
  Summary,
  Correlations,
  PaceBin,
  SplitAnalysis,
  MetricStats,
} from '../types/fit';
import { mean, std, correlation } from './statistics';

/**
 * Debug info about parsed records
 */
export interface ParseDebugInfo {
  totalRecords: number;
  recordsWithSpeed: number;
  recordsWithGCT: number;
  recordsWithHR: number;
  recordsWithCadence: number;
  recordsWithPower: number;
  sampleRecord: FITRecord | null;
  speedRange: { min: number; max: number } | null;
  gctRange: { min: number; max: number } | null;
}

/**
 * Get raw speed value (before any processing) for debugging
 */
function getRawSpeed(r: FITRecord): number {
  if (r.enhanced_speed !== undefined && r.enhanced_speed > 0) {
    return r.enhanced_speed > 100 ? r.enhanced_speed / 1000 : r.enhanced_speed;
  }
  if (r.speed !== undefined && r.speed > 0) {
    return r.speed > 100 ? r.speed / 1000 : r.speed;
  }
  return 0;
}

/**
 * Analyze raw records for debugging
 */
export function analyzeRawRecords(records: FITRecord[]): ParseDebugInfo {
  const speeds: number[] = [];
  const gcts: number[] = [];

  let recordsWithSpeed = 0;
  let recordsWithGCT = 0;
  let recordsWithHR = 0;
  let recordsWithCadence = 0;
  let recordsWithPower = 0;

  for (const r of records) {
    const speed = getRawSpeed(r);
    const gct = r.stance_time ?? r.ground_time ?? 0;

    if (speed > 0) {
      recordsWithSpeed++;
      speeds.push(speed);
    }
    if (gct > 0) {
      recordsWithGCT++;
      gcts.push(gct);
    }
    if (r.heart_rate) recordsWithHR++;
    if (r.cadence) recordsWithCadence++;
    if (r.power || r.stryd_power) recordsWithPower++;
  }

  return {
    totalRecords: records.length,
    recordsWithSpeed,
    recordsWithGCT,
    recordsWithHR,
    recordsWithCadence,
    recordsWithPower,
    sampleRecord: records.length > 0 ? records[Math.floor(records.length / 2)] : null,
    speedRange: speeds.length > 0 ? { min: Math.min(...speeds), max: Math.max(...speeds) } : null,
    gctRange: gcts.length > 0 ? { min: Math.min(...gcts), max: Math.max(...gcts) } : null,
  };
}

/**
 * Get speed in m/s from a FIT record
 * Both speed and enhanced_speed have scale factor 1000 in FIT SDK
 */
function getSpeedMs(r: FITRecord): number {
  // enhanced_speed is uint32 with scale 1000 (value in mm/s, divide by 1000 for m/s)
  if (r.enhanced_speed !== undefined && r.enhanced_speed > 0) {
    // Check if value seems to be already in m/s (< 30) or needs scaling (> 100)
    if (r.enhanced_speed > 100) {
      return r.enhanced_speed / 1000;
    }
    return r.enhanced_speed;
  }
  // speed is uint16 with scale 1000 (value in mm/s)
  if (r.speed !== undefined && r.speed > 0) {
    if (r.speed > 100) {
      return r.speed / 1000;
    }
    return r.speed;
  }
  return 0;
}

/**
 * Get distance in km from raw FIT value
 * FIT SDK: distance has scale 100, units m
 * So raw_value / 100 = meters, / 1000 = km
 */
function getDistanceKm(rawDistance: number | undefined): number | null {
  if (rawDistance === undefined || rawDistance === 0) return null;
  // Raw value is in centimeters (scale 100 means divide by 100 to get meters)
  return rawDistance / 100 / 1000; // cm -> m -> km
}

/**
 * Get GCT in ms from raw FIT value
 * FIT SDK: stance_time has scale 10, units ms
 * So raw_value / 10 = milliseconds
 */
function getGctMs(rawGct: number | undefined): number | null {
  if (rawGct === undefined || rawGct === 0) return null;
  // Raw value is in 0.1ms (scale 10)
  const gctMs = rawGct / 10;
  // Validate reasonable range for running (150-400ms)
  if (gctMs >= 150 && gctMs <= 400) {
    return gctMs;
  }
  return null;
}

/**
 * Get vertical oscillation in cm from raw FIT value
 * FIT SDK: vertical_oscillation has scale 100, units mm
 * Raw value / 100 = mm, / 10 = cm
 */
function getVOCm(rawVO: number | undefined): number | null {
  if (rawVO === undefined || rawVO === 0) return null;
  // Raw value is in 0.1mm (scale 100 means divide by 100 to get mm)
  // Then divide by 10 to get cm
  return rawVO / 100 / 10; // 0.1mm -> mm -> cm
}

/**
 * Get step length in mm from raw FIT value
 * FIT SDK: step_length has scale 10, units mm
 */
function getStepLengthMm(rawSL: number | undefined): number | null {
  if (rawSL === undefined || rawSL === 0) return null;
  // Raw value is in 0.1mm (scale 10)
  return rawSL / 10;
}

/**
 * Get vertical ratio as percentage from raw FIT value
 * FIT SDK: vertical_ratio has scale 100, units percent
 */
function getVerticalRatioPercent(rawVR: number | undefined): number | null {
  if (rawVR === undefined || rawVR === 0) return null;
  // Raw value is in 0.01% (scale 100)
  return rawVR / 100;
}

/**
 * Get stance time balance as percentage from raw FIT value
 * FIT SDK: stance_time_balance has scale 100, units percent
 */
function getStanceTimeBalancePercent(rawBalance: number | undefined): number | null {
  if (rawBalance === undefined || rawBalance === 0) return null;
  // Raw value is in 0.01% (scale 100)
  return rawBalance / 100;
}

/**
 * Process raw FIT records into running data points
 * Now works with or without running dynamics data
 */
export function processRecords(records: FITRecord[]): RunningDataPoint[] {
  let lastValidDistance = 0;

  return records
    .filter((r) => {
      // Only require speed - running dynamics are optional
      const speed = getSpeedMs(r);
      return speed > 0.5; // Minimum running speed (very slow jog)
    })
    .map((r, idx) => {
      const speed = getSpeedMs(r);
      const cadence = r.cadence ? (r.cadence + (r.fractional_cadence ?? 0)) * 2 : null;

      // Distance in km
      const distanceKm = getDistanceKm(r.distance);
      if (distanceKm !== null) {
        lastValidDistance = distanceKm;
      }

      // Vertical oscillation in cm
      const vo = getVOCm(r.vertical_oscillation) ?? r.vertical_oscillation_stryd ?? null;

      // Ground contact time in ms
      const gct = getGctMs(r.stance_time) ?? getGctMs(r.ground_time) ?? null;

      // Step length in mm
      const sl = getStepLengthMm(r.step_length);

      // Vertical ratio as percentage
      let vr = getVerticalRatioPercent(r.vertical_ratio);
      // Calculate if not provided (VO in cm, SL in mm)
      if (vr === null && vo !== null && sl !== null && sl > 0) {
        // VR = (VO in mm) / (SL in mm) * 100
        vr = ((vo * 10) / sl) * 100;
      }

      // GCT Balance
      const gctBalance = getStanceTimeBalancePercent(r.stance_time_balance);

      // Power: prefer Stryd power, fallback to Garmin power
      const power = r.stryd_power ?? r.power ?? null;

      // LSS from developer fields (check common dev field patterns)
      let lss = r.leg_spring_stiffness ?? null;
      // Check for LSS in developer fields (dev_0_9 is common for Stryd LSS)
      for (const key of Object.keys(r)) {
        if (key.startsWith('dev_') && lss === null) {
          const val = r[key];
          // LSS is typically 7-15 kN/m
          if (typeof val === 'number' && val >= 5 && val <= 20) {
            lss = val;
            break;
          }
        }
      }

      return {
        idx,
        timestamp: r.timestamp ?? idx,
        distance: distanceKm ?? lastValidDistance,
        speed,
        pace: speed > 0 ? 1000 / (speed * 60) : null, // min/km
        gct: gct ?? 0, // Use 0 as placeholder for missing GCT
        vo,
        sl,
        cadence,
        vr,
        gctBalance,
        hr: r.heart_rate ?? null,
        power,
        formPower: r.form_power ?? null,
        lss,
        airPower: r.air_power ?? null,
        altitude: r.enhanced_altitude ?? r.altitude ?? r.elevation ?? null,
        impactLoadingRate: r.impact_loading_rate ?? null,
        brakingImpulse: r.braking_impulse ?? null,
      };
    });
}

/**
 * Helper to calculate metric stats
 */
function calcStats(arr: number[], decimals: number = 1): MetricStats {
  if (arr.length === 0) {
    return { mean: '0', std: '0', min: 0, max: 0 };
  }
  return {
    mean: mean(arr).toFixed(decimals),
    std: std(arr).toFixed(decimals),
    min: Math.min(...arr),
    max: Math.max(...arr),
  };
}

/**
 * Extract non-null values from processed data
 */
function extractValues(data: RunningDataPoint[], key: keyof RunningDataPoint): number[] {
  return data
    .map((r) => r[key] as number | null)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v) && v !== 0);
}

/**
 * Format pace from numeric value to MM:SS string
 */
export function formatPace(paceNum: number | null): string {
  if (!paceNum || paceNum > 20 || paceNum < 0) return '--:--';
  const minutes = Math.floor(paceNum);
  const seconds = Math.floor((paceNum % 1) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate all metrics and analysis from processed data
 */
export function calculateMetrics(processed: RunningDataPoint[]): AnalysisResult | null {
  if (processed.length < 10) return null;

  // Extract arrays for each metric
  const gct = extractValues(processed, 'gct');
  const vo = extractValues(processed, 'vo');
  const sl = extractValues(processed, 'sl');
  const cadence = extractValues(processed, 'cadence');
  const speed = extractValues(processed, 'speed');
  const vr = extractValues(processed, 'vr');
  const gctBalance = extractValues(processed, 'gctBalance').filter((v) => v > 40 && v < 60);
  const hr = extractValues(processed, 'hr');
  const power = extractValues(processed, 'power');
  const formPower = extractValues(processed, 'formPower');
  const lss = extractValues(processed, 'lss');
  const airPower = extractValues(processed, 'airPower');
  const impactLoadingRate = extractValues(processed, 'impactLoadingRate');

  // Check for Stryd data
  const hasStrydData = power.length > 0 || formPower.length > 0 || lss.length > 0;

  // Check for running dynamics data
  const hasRunningDynamics = gct.length > 0;

  // Calculate average pace
  const avgSpeed = mean(speed);
  const avgPace = avgSpeed > 0 ? 1000 / (avgSpeed * 60) : 0;

  // Build summary
  const summary: Summary = {
    duration: processed.length,
    distance: (processed[processed.length - 1]?.distance ?? 0).toFixed(2),
    avgPace: formatPace(avgPace),
    avgSpeed: avgSpeed.toFixed(2),
    gct: gct.length > 0 ? calcStats(gct) : { mean: 'N/A', std: 'N/A', min: 0, max: 0 },
    vo: vo.length > 0 ? calcStats(vo, 2) : { mean: 'N/A', std: 'N/A', min: 0, max: 0 },
    sl: sl.length > 0 ? calcStats(sl, 0) : { mean: 'N/A', std: 'N/A', min: 0, max: 0 },
    cadence: cadence.length > 0 ? calcStats(cadence, 0) : { mean: 'N/A', std: 'N/A', min: 0, max: 0 },
    vr: vr.length > 0 ? calcStats(vr, 2) : { mean: 'N/A', std: 'N/A', min: 0, max: 0 },
    gctBalance: gctBalance.length ? mean(gctBalance).toFixed(1) : 'N/A',
    hr: hr.length ? { mean: mean(hr).toFixed(0), max: Math.max(...hr) } : null,
    power: power.length ? calcStats(power, 0) : null,
    formPower: formPower.length ? calcStats(formPower, 0) : null,
    lss: lss.length ? calcStats(lss, 2) : null,
    airPower: airPower.length ? calcStats(airPower, 1) : null,
    impactLoadingRate: impactLoadingRate.length ? calcStats(impactLoadingRate, 1) : null,
  };

  // Calculate correlations (only if we have enough data)
  const correlations: Correlations = {
    gctSpeed: gct.length > 10 ? correlation(gct, speed.slice(0, gct.length)) : 0,
    gctCadence: gct.length > 10 && cadence.length > 10 ? correlation(gct, cadence.slice(0, gct.length)) : 0,
    slSpeed: sl.length > 10 ? correlation(sl, speed.slice(0, sl.length)) : 0,
    slCadence: sl.length > 10 && cadence.length > 10 ? correlation(sl, cadence.slice(0, sl.length)) : 0,
    voSpeed: vo.length > 10 ? correlation(vo, speed.slice(0, vo.length)) : 0,
    vrSpeed: vr.length > 10 ? correlation(vr, speed.slice(0, vr.length)) : 0,
    powerSpeed: power.length > 10 ? correlation(power, speed.slice(0, power.length)) : 0,
    lssSpeed: lss.length > 10 ? correlation(lss, speed.slice(0, lss.length)) : 0,
    formPowerSpeed: formPower.length > 10 ? correlation(formPower, speed.slice(0, formPower.length)) : 0,
    hrSpeed: hr.length > 10 ? correlation(hr, speed.slice(0, hr.length)) : 0,
    cadenceSpeed: cadence.length > 10 ? correlation(cadence, speed.slice(0, cadence.length)) : 0,
  };

  // Pace bins analysis
  const paceBins: PaceBin[] = [];
  const speedRanges: [number, number][] = [
    [2.0, 2.5],
    [2.5, 3.0],
    [3.0, 3.5],
    [3.5, 4.0],
    [4.0, 4.5],
    [4.5, 5.0],
    [5.0, 5.5],
    [5.5, 6.0],
  ];

  for (const [low, high] of speedRanges) {
    const subset = processed.filter((r) => r.speed >= low && r.speed < high);
    if (subset.length > 5) {
      const midSpeed = (low + high) / 2;
      const paceNum = 1000 / (midSpeed * 60);

      const binGct = extractValues(subset, 'gct');
      const binVo = extractValues(subset, 'vo');
      const binCadence = extractValues(subset, 'cadence');
      const binSl = extractValues(subset, 'sl');
      const binVr = extractValues(subset, 'vr');
      const binPower = extractValues(subset, 'power');
      const binFormPower = extractValues(subset, 'formPower');
      const binLss = extractValues(subset, 'lss');

      paceBins.push({
        pace: formatPace(paceNum),
        paceNum,
        gct: binGct.length > 0 ? Math.round(mean(binGct)) : 0,
        vo: binVo.length > 0 ? mean(binVo).toFixed(2) : 'N/A',
        cadence: binCadence.length > 0 ? Math.round(mean(binCadence)) : 0,
        sl: binSl.length > 0 ? Math.round(mean(binSl)) : 0,
        vr: binVr.length > 0 ? mean(binVr).toFixed(2) : 'N/A',
        power: binPower.length > 0 ? Math.round(mean(binPower)) : undefined,
        formPower: binFormPower.length > 0 ? Math.round(mean(binFormPower)) : undefined,
        lss: binLss.length > 0 ? mean(binLss).toFixed(2) : undefined,
        count: subset.length,
      });
    }
  }

  // Sort by pace (fastest first)
  paceBins.sort((a, b) => a.paceNum - b.paceNum);

  // Split analysis (first vs last quarter)
  const n = processed.length;
  const q1 = processed.slice(0, Math.floor(n / 4));
  const q4 = processed.slice(Math.floor((3 * n) / 4));

  const splitAnalysis: SplitAnalysis = {
    firstQuarter: {
      gct: gct.length > 0 ? mean(extractValues(q1, 'gct')) : 0,
      vo: vo.length > 0 ? mean(extractValues(q1, 'vo')) : 0,
      cadence: cadence.length > 0 ? mean(extractValues(q1, 'cadence')) : 0,
      vr: vr.length > 0 ? mean(extractValues(q1, 'vr')) : 0,
      power: power.length > 0 ? mean(extractValues(q1, 'power')) : undefined,
      formPower: formPower.length > 0 ? mean(extractValues(q1, 'formPower')) : undefined,
      lss: lss.length > 0 ? mean(extractValues(q1, 'lss')) : undefined,
      hr: hr.length > 0 ? mean(extractValues(q1, 'hr')) : undefined,
    },
    lastQuarter: {
      gct: gct.length > 0 ? mean(extractValues(q4, 'gct')) : 0,
      vo: vo.length > 0 ? mean(extractValues(q4, 'vo')) : 0,
      cadence: cadence.length > 0 ? mean(extractValues(q4, 'cadence')) : 0,
      vr: vr.length > 0 ? mean(extractValues(q4, 'vr')) : 0,
      power: power.length > 0 ? mean(extractValues(q4, 'power')) : undefined,
      formPower: formPower.length > 0 ? mean(extractValues(q4, 'formPower')) : undefined,
      lss: lss.length > 0 ? mean(extractValues(q4, 'lss')) : undefined,
      hr: hr.length > 0 ? mean(extractValues(q4, 'hr')) : undefined,
    },
  };

  return {
    summary,
    correlations,
    paceBins,
    splitAnalysis,
    processed,
    hasStrydData,
    hasRunningDynamics,
  };
}
