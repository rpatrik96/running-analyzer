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
 * Process raw FIT records into running data points
 */
export function processRecords(records: FITRecord[]): RunningDataPoint[] {
  return records
    .filter((r) => {
      // Filter for valid running data
      const speed = r.enhanced_speed ?? (r.speed ? r.speed / 1000 : 0);
      const gct = r.stance_time ?? r.ground_time;
      return speed > 0.5 && gct && gct > 100 && gct < 500;
    })
    .map((r, idx) => {
      const speed = r.enhanced_speed ?? (r.speed ? r.speed / 1000 : 0);
      const cadence = r.cadence ? (r.cadence + (r.fractional_cadence ?? 0)) * 2 : null;

      // Vertical oscillation: prefer Garmin, fallback to Stryd
      const vo = r.vertical_oscillation
        ? r.vertical_oscillation / 10 // Convert to cm
        : r.vertical_oscillation_stryd ?? null;

      // Ground contact time: prefer Garmin stance_time, fallback to Stryd ground_time
      const gct = r.stance_time ?? r.ground_time ?? 0;

      // Step length
      const sl = r.step_length ?? null;

      // Vertical ratio: calculate if not provided
      const vr = r.vertical_ratio ?? (vo && sl ? (vo * 10 / sl) * 100 : null);

      // Power: prefer Stryd power, fallback to Garmin power
      const power = r.stryd_power ?? r.power ?? null;

      return {
        idx,
        timestamp: r.timestamp ?? idx,
        distance: r.distance ? r.distance / 1000 : idx * speed / 1000,
        speed,
        pace: speed > 0 ? 1000 / (speed * 60) : null, // min/km
        gct,
        vo,
        sl,
        cadence,
        vr,
        gctBalance: r.stance_time_balance ?? null,
        hr: r.heart_rate ?? null,
        power,
        formPower: r.form_power ?? null,
        lss: r.leg_spring_stiffness ?? null,
        airPower: r.air_power ?? null,
        altitude: r.enhanced_altitude ?? r.altitude ?? r.elevation ?? null,
        impactLoadingRate: r.impact_loading_rate ?? null,
        brakingImpulse: r.braking_impulse ?? null,
      };
    })
    .filter((r) => r.gct > 150 && r.gct < 350); // Final sanity filter
}

/**
 * Helper to calculate metric stats
 */
function calcStats(arr: number[], decimals: number = 1): MetricStats {
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
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));
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

  // Calculate average pace
  const avgSpeed = mean(speed);
  const avgPace = avgSpeed > 0 ? 1000 / (avgSpeed * 60) : 0;

  // Build summary
  const summary: Summary = {
    duration: processed.length,
    distance: (processed[processed.length - 1]?.distance ?? 0).toFixed(2),
    avgPace: formatPace(avgPace),
    avgSpeed: avgSpeed.toFixed(2),
    gct: calcStats(gct),
    vo: calcStats(vo, 2),
    sl: calcStats(sl, 0),
    cadence: calcStats(cadence, 0),
    vr: calcStats(vr, 2),
    gctBalance: gctBalance.length ? mean(gctBalance).toFixed(1) : 'N/A',
    hr: hr.length ? { mean: mean(hr).toFixed(0), max: Math.max(...hr) } : null,
    power: power.length ? calcStats(power, 0) : null,
    formPower: formPower.length ? calcStats(formPower, 0) : null,
    lss: lss.length ? calcStats(lss, 2) : null,
    airPower: airPower.length ? calcStats(airPower, 1) : null,
    impactLoadingRate: impactLoadingRate.length ? calcStats(impactLoadingRate, 1) : null,
  };

  // Calculate correlations
  const correlations: Correlations = {
    gctSpeed: correlation(gct, speed.slice(0, gct.length)),
    gctCadence: correlation(gct, cadence.slice(0, gct.length)),
    slSpeed: correlation(sl, speed.slice(0, sl.length)),
    slCadence: correlation(sl, cadence.slice(0, sl.length)),
    voSpeed: correlation(vo, speed.slice(0, vo.length)),
    vrSpeed: correlation(vr, speed.slice(0, vr.length)),
    powerSpeed: power.length > 0 ? correlation(power, speed.slice(0, power.length)) : 0,
    lssSpeed: lss.length > 0 ? correlation(lss, speed.slice(0, lss.length)) : 0,
    formPowerSpeed: formPower.length > 0 ? correlation(formPower, speed.slice(0, formPower.length)) : 0,
    hrSpeed: hr.length > 0 ? correlation(hr, speed.slice(0, hr.length)) : 0,
    cadenceSpeed: correlation(cadence, speed.slice(0, cadence.length)),
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
    if (subset.length > 10) {
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
        gct: Math.round(mean(binGct)),
        vo: mean(binVo).toFixed(2),
        cadence: Math.round(mean(binCadence)),
        sl: Math.round(mean(binSl)),
        vr: mean(binVr).toFixed(2),
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
      gct: mean(extractValues(q1, 'gct')),
      vo: mean(extractValues(q1, 'vo')),
      cadence: mean(extractValues(q1, 'cadence')),
      vr: mean(extractValues(q1, 'vr')),
      power: power.length > 0 ? mean(extractValues(q1, 'power')) : undefined,
      formPower: formPower.length > 0 ? mean(extractValues(q1, 'formPower')) : undefined,
      lss: lss.length > 0 ? mean(extractValues(q1, 'lss')) : undefined,
      hr: hr.length > 0 ? mean(extractValues(q1, 'hr')) : undefined,
    },
    lastQuarter: {
      gct: mean(extractValues(q4, 'gct')),
      vo: mean(extractValues(q4, 'vo')),
      cadence: mean(extractValues(q4, 'cadence')),
      vr: mean(extractValues(q4, 'vr')),
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
  };
}
