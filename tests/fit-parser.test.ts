/**
 * Tests for FIT file parsing and metric extraction
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFITFile } from '../src/lib/fit-parser';
import { processRecords, calculateMetrics } from '../src/lib/data-processor';
import type { FITRecord, RunningDataPoint, AnalysisResult } from '../src/types/fit';

describe('FIT Parser', () => {
  let records: FITRecord[];
  let processed: RunningDataPoint[];
  let metrics: AnalysisResult | null;

  beforeAll(async () => {
    const filePath = join(__dirname, 'sample-garmin.fit');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    records = await parseFITFile(arrayBuffer);
    processed = processRecords(records);
    metrics = calculateMetrics(processed);
  });

  describe('Raw Record Parsing', () => {
    it('should parse records from FIT file', () => {
      expect(records.length).toBeGreaterThan(0);
      console.log(`Parsed ${records.length} raw records`);
    });

    it('should have timestamp in records', () => {
      const withTimestamp = records.filter(r => r.timestamp !== undefined);
      expect(withTimestamp.length).toBeGreaterThan(0);
    });

    it('should have speed data in records', () => {
      const withSpeed = records.filter(r => r.enhanced_speed !== undefined || r.speed !== undefined);
      expect(withSpeed.length).toBeGreaterThan(0);
      console.log(`Records with speed: ${withSpeed.length}`);
    });

    it('should have distance data in records', () => {
      const withDistance = records.filter(r => r.distance !== undefined && r.distance > 0);
      expect(withDistance.length).toBeGreaterThan(0);
      console.log(`Records with distance: ${withDistance.length}`);
    });

    it('should have stance_time (GCT) in records', () => {
      const withGCT = records.filter(r => r.stance_time !== undefined && r.stance_time > 0);
      expect(withGCT.length).toBeGreaterThan(0);
      console.log(`Records with stance_time: ${withGCT.length}`);
    });

    it('should have vertical_oscillation in records', () => {
      const withVO = records.filter(r => r.vertical_oscillation !== undefined && r.vertical_oscillation > 0);
      expect(withVO.length).toBeGreaterThan(0);
      console.log(`Records with vertical_oscillation: ${withVO.length}`);
    });

    it('should have step_length or step_length_alt in records', () => {
      const withSL = records.filter(r =>
        (r.step_length !== undefined && r.step_length > 0) ||
        (r.step_length_alt !== undefined && r.step_length_alt > 0)
      );
      expect(withSL.length).toBeGreaterThan(0);
      console.log(`Records with step_length: ${withSL.length}`);
    });

    it('should have heart_rate in records', () => {
      const withHR = records.filter(r => r.heart_rate !== undefined && r.heart_rate > 0);
      expect(withHR.length).toBeGreaterThan(0);
      console.log(`Records with heart_rate: ${withHR.length}`);
    });

    it('should have cadence in records', () => {
      const withCadence = records.filter(r => r.cadence !== undefined && r.cadence > 0);
      expect(withCadence.length).toBeGreaterThan(0);
      console.log(`Records with cadence: ${withCadence.length}`);
    });
  });

  describe('Processed Records', () => {
    it('should process records successfully', () => {
      expect(processed.length).toBeGreaterThan(0);
      console.log(`Processed ${processed.length} data points`);
    });

    it('should have valid speed values (0.5-7 m/s)', () => {
      const speeds = processed.map(r => r.speed).filter(s => s > 0);
      expect(speeds.length).toBeGreaterThan(0);
      speeds.forEach(speed => {
        expect(speed).toBeGreaterThan(0.5);
        expect(speed).toBeLessThan(7);
      });
      console.log(`Speed range: ${Math.min(...speeds).toFixed(2)} - ${Math.max(...speeds).toFixed(2)} m/s`);
    });

    it('should have valid distance values (km)', () => {
      const distances = processed.map(r => r.distance).filter(d => d > 0);
      expect(distances.length).toBeGreaterThan(0);
      const maxDistance = Math.max(...distances);
      expect(maxDistance).toBeGreaterThan(0);
      expect(maxDistance).toBeLessThan(100); // Less than 100km
      console.log(`Max distance: ${maxDistance.toFixed(2)} km`);
    });

    it('should have valid GCT values (150-400 ms)', () => {
      const gcts = processed.map(r => r.gct).filter(g => g > 0);
      expect(gcts.length).toBeGreaterThan(0);
      gcts.forEach(gct => {
        expect(gct).toBeGreaterThanOrEqual(150);
        expect(gct).toBeLessThanOrEqual(400);
      });
      console.log(`GCT range: ${Math.min(...gcts).toFixed(0)} - ${Math.max(...gcts).toFixed(0)} ms`);
    });

    it('should have valid VO values (3-15 cm)', () => {
      const vos = processed.map(r => r.vo).filter((v): v is number => v !== null && v > 0);
      expect(vos.length).toBeGreaterThan(0);
      vos.forEach(vo => {
        expect(vo).toBeGreaterThan(3);
        expect(vo).toBeLessThan(15);
      });
      console.log(`VO range: ${Math.min(...vos).toFixed(2)} - ${Math.max(...vos).toFixed(2)} cm`);
    });

    it('should have valid step length values (400-1500 mm)', () => {
      const sls = processed.map(r => r.sl).filter((s): s is number => s !== null && s > 0);
      expect(sls.length).toBeGreaterThan(0);
      sls.forEach(sl => {
        expect(sl).toBeGreaterThan(400);
        expect(sl).toBeLessThan(1500);
      });
      console.log(`Step length range: ${Math.min(...sls).toFixed(0)} - ${Math.max(...sls).toFixed(0)} mm`);
    });

    it('should have valid cadence values (100-360 spm)', () => {
      const cadences = processed.map(r => r.cadence).filter((c): c is number => c !== null && c > 0);
      expect(cadences.length).toBeGreaterThan(0);
      cadences.forEach(cadence => {
        expect(cadence).toBeGreaterThan(100);
        expect(cadence).toBeLessThanOrEqual(360); // Doubled values can be high during sprints
      });
      console.log(`Cadence range: ${Math.min(...cadences).toFixed(0)} - ${Math.max(...cadences).toFixed(0)} spm`);
    });

    it('should have valid HR values (50-220 bpm)', () => {
      const hrs = processed.map(r => r.hr).filter((h): h is number => h !== null && h > 0);
      expect(hrs.length).toBeGreaterThan(0);
      hrs.forEach(hr => {
        expect(hr).toBeGreaterThan(50);
        expect(hr).toBeLessThan(220);
      });
      console.log(`HR range: ${Math.min(...hrs).toFixed(0)} - ${Math.max(...hrs).toFixed(0)} bpm`);
    });

    it('should have valid VR values (3-15 %)', () => {
      const vrs = processed.map(r => r.vr).filter((v): v is number => v !== null && v > 0);
      expect(vrs.length).toBeGreaterThan(0);
      vrs.forEach(vr => {
        expect(vr).toBeGreaterThan(3);
        expect(vr).toBeLessThan(15); // Can be higher at slow paces
      });
      console.log(`VR range: ${Math.min(...vrs).toFixed(2)} - ${Math.max(...vrs).toFixed(2)} %`);
    });
  });

  describe('Calculated Metrics', () => {
    it('should calculate metrics successfully', () => {
      expect(metrics).not.toBeNull();
    });

    it('should have valid summary distance', () => {
      expect(metrics!.summary.distance).not.toBe('0.00');
      const distance = parseFloat(metrics!.summary.distance);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100);
      console.log(`Total distance: ${distance} km`);
    });

    it('should have valid summary GCT', () => {
      expect(metrics!.summary.gct.mean).not.toBe('N/A');
      const gct = parseFloat(metrics!.summary.gct.mean);
      expect(gct).toBeGreaterThan(150);
      expect(gct).toBeLessThan(400);
      console.log(`Mean GCT: ${gct} ms (±${metrics!.summary.gct.std})`);
    });

    it('should have valid summary VO', () => {
      expect(metrics!.summary.vo.mean).not.toBe('N/A');
      const vo = parseFloat(metrics!.summary.vo.mean);
      expect(vo).toBeGreaterThan(3);
      expect(vo).toBeLessThan(15);
      console.log(`Mean VO: ${vo} cm (±${metrics!.summary.vo.std})`);
    });

    it('should have valid summary step length', () => {
      expect(metrics!.summary.sl.mean).not.toBe('N/A');
      const sl = parseFloat(metrics!.summary.sl.mean);
      expect(sl).toBeGreaterThan(400);
      expect(sl).toBeLessThan(1500);
      console.log(`Mean step length: ${sl} mm (±${metrics!.summary.sl.std})`);
    });

    it('should have valid summary cadence', () => {
      expect(metrics!.summary.cadence.mean).not.toBe('N/A');
      const cadence = parseFloat(metrics!.summary.cadence.mean);
      expect(cadence).toBeGreaterThan(100);
      expect(cadence).toBeLessThan(320); // Doubled values
      console.log(`Mean cadence: ${cadence} spm (±${metrics!.summary.cadence.std})`);
    });

    it('should have valid summary VR', () => {
      expect(metrics!.summary.vr.mean).not.toBe('N/A');
      const vr = parseFloat(metrics!.summary.vr.mean);
      expect(vr).toBeGreaterThan(3);
      expect(vr).toBeLessThan(12);
      console.log(`Mean VR: ${vr}% (±${metrics!.summary.vr.std})`);
    });

    it('should have valid avg pace', () => {
      expect(metrics!.summary.avgPace).not.toBe('--:--');
      console.log(`Avg pace: ${metrics!.summary.avgPace}/km`);
    });

    it('should have HR data', () => {
      expect(metrics!.summary.hr).not.toBeNull();
      console.log(`Mean HR: ${metrics!.summary.hr!.mean} bpm, Max: ${metrics!.summary.hr!.max}`);
    });

    it('should have pace bins', () => {
      expect(metrics!.paceBins.length).toBeGreaterThan(0);
      console.log(`Pace bins: ${metrics!.paceBins.length}`);
    });

    it('should have correlations', () => {
      expect(metrics!.correlations.gctSpeed).not.toBe(0);
      console.log(`GCT-Speed correlation: ${metrics!.correlations.gctSpeed.toFixed(3)}`);
    });
  });

  describe('Metric Summary', () => {
    it('should display all metrics summary', () => {
      console.log('\n=== METRICS SUMMARY ===');
      console.log('Distance:', metrics!.summary.distance, 'km');
      console.log('Avg Pace:', metrics!.summary.avgPace, '/km');
      console.log('Duration:', metrics!.summary.duration, 'records');
      console.log('');
      console.log('GCT:', metrics!.summary.gct.mean, '±', metrics!.summary.gct.std, 'ms');
      console.log('VO:', metrics!.summary.vo.mean, '±', metrics!.summary.vo.std, 'cm');
      console.log('Step Length:', metrics!.summary.sl.mean, '±', metrics!.summary.sl.std, 'mm');
      console.log('Cadence:', metrics!.summary.cadence.mean, '±', metrics!.summary.cadence.std, 'spm');
      console.log('VR:', metrics!.summary.vr.mean, '±', metrics!.summary.vr.std, '%');
      console.log('HR:', metrics!.summary.hr?.mean, 'bpm (max:', metrics!.summary.hr?.max, ')');
      console.log('GCT Balance:', metrics!.summary.gctBalance);
      console.log('');
      console.log('Has Running Dynamics:', metrics!.hasRunningDynamics);
      console.log('Has Stryd Data:', metrics!.hasStrydData);
      console.log('========================\n');

      // Ensure all critical metrics are present
      expect(metrics!.summary.gct.mean).not.toBe('N/A');
      expect(metrics!.summary.vo.mean).not.toBe('N/A');
      expect(metrics!.summary.sl.mean).not.toBe('N/A');
      expect(metrics!.summary.cadence.mean).not.toBe('N/A');
      expect(metrics!.summary.vr.mean).not.toBe('N/A');
    });
  });
});
