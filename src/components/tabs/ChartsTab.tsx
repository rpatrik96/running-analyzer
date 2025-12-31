import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import type { AnalysisResult } from '../../types/fit';

interface ChartsTabProps {
  data: AnalysisResult;
}

// Format pace from decimal minutes to MM:SS
function formatPace(pace: number | null): string {
  if (!pace || pace > 15 || pace < 2) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace % 1) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Generate nice pace tick values (whole minutes and half minutes)
function getPaceTicks(minPace: number, maxPace: number): number[] {
  const ticks: number[] = [];
  // Start from floor of min, go to ceil of max, in 0.5 increments
  const start = Math.floor(minPace);
  const end = Math.ceil(maxPace);
  for (let p = start; p <= end; p += 0.5) {
    if (p >= minPace - 0.3 && p <= maxPace + 0.3) {
      ticks.push(p);
    }
  }
  return ticks;
}

// Calculate percentile value from sorted array
function percentile(sortedArr: number[], p: number): number {
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

export function ChartsTab({ data }: ChartsTabProps) {
  const { processed, correlations, hasStrydData } = data;
  const [filterOutliers, setFilterOutliers] = useState(true);

  // Downsample for better performance and filter for valid pace
  const chartData = processed.filter((_, i) => i % 5 === 0);

  // Calculate outlier threshold (95th percentile of pace = slowest 5%)
  const allPaces = useMemo(() => {
    const paces = processed
      .map(d => d.pace)
      .filter((p): p is number => p !== null && p > 2 && p < 15)
      .sort((a, b) => a - b);
    return paces;
  }, [processed]);

  const paceThreshold = useMemo(() => {
    if (allPaces.length === 0) return 10;
    // Use 95th percentile as outlier threshold (slower than 95% of data points)
    return percentile(allPaces, 95);
  }, [allPaces]);

  // Filter scatter data based on outlier setting
  const scatterData = useMemo(() => {
    let data = processed
      .filter((_, i) => i % 3 === 0)
      .filter(d => d.pace !== null && d.pace > 2 && d.pace < 15);

    if (filterOutliers) {
      data = data.filter(d => (d.pace as number) <= paceThreshold);
    }

    return data;
  }, [processed, filterOutliers, paceThreshold]);

  // Calculate pace range for tick generation
  const { minPace, maxPace, paceTicks } = useMemo(() => {
    const paces = scatterData.map(d => d.pace as number);
    if (paces.length === 0) return { minPace: 4, maxPace: 8, paceTicks: [4, 5, 6, 7, 8] };
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    return { minPace: min, maxPace: max, paceTicks: getPaceTicks(min, max) };
  }, [scatterData]);

  const outlierCount = useMemo(() => {
    const total = processed.filter(d => d.pace !== null && d.pace > 2 && d.pace < 15).length;
    const filtered = processed.filter(d => d.pace !== null && d.pace > 2 && (d.pace as number) <= paceThreshold).length;
    return total - filtered;
  }, [processed, paceThreshold]);

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filterOutliers}
            onChange={(e) => setFilterOutliers(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Filter outliers (very slow paces)
          </span>
        </label>
        {filterOutliers && outlierCount > 0 && (
          <span className="text-xs text-gray-500">
            Hiding {outlierCount} points slower than {formatPace(paceThreshold)}/km
          </span>
        )}
      </div>

      {/* GCT over distance */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Ground Contact Time Over Distance</h3>
        <p className="text-xs text-gray-500 mb-4">
          Tracks fatigue - rising GCT indicates declining neuromuscular efficiency
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="distance"
              tickFormatter={(v) => v.toFixed(1)}
              label={{ value: 'Distance (km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              domain={['dataMin - 20', 'dataMax + 20']}
              label={{ value: 'GCT (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(0)} ms`, 'GCT']}
              labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
            />
            <Line type="monotone" dataKey="gct" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <ReferenceLine y={240} stroke="#10b981" strokeDasharray="5 5" label="Target" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* GCT vs Pace */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          GCT vs Pace
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.gctSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Should be strongly positive (slower pace = more ground contact time)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="pace"
              name="Pace"
              type="number"
              domain={[minPace - 0.3, maxPace + 0.3]}
              ticks={paceTicks}
              tickFormatter={formatPace}
              label={{ value: 'Pace (min/km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="gct"
              name="GCT"
              domain={['dataMin - 10', 'dataMax + 10']}
              label={{ value: 'GCT (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'GCT' ? `${value.toFixed(0)} ms` : formatPace(value) + '/km',
                name === 'GCT' ? 'GCT' : 'Pace',
              ]}
            />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Step Length vs Pace */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          Step Length vs Pace
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.slSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Negative correlation indicates stride-length dominant running style
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="pace"
              type="number"
              domain={[minPace - 0.3, maxPace + 0.3]}
              ticks={paceTicks}
              tickFormatter={formatPace}
              label={{ value: 'Pace (min/km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="sl"
              domain={['dataMin - 50', 'dataMax + 50']}
              label={{ value: 'Step Length (mm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'sl' ? `${value.toFixed(0)} mm` : formatPace(value) + '/km',
                name === 'sl' ? 'Step Length' : 'Pace',
              ]}
            />
            <Scatter data={scatterData.filter(d => d.sl !== null)} fill="#10b981" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Cadence vs Pace */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          Cadence vs Pace
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.cadenceSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Negative correlation indicates cadence-dominant running style
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="pace"
              type="number"
              domain={[minPace - 0.3, maxPace + 0.3]}
              ticks={paceTicks}
              tickFormatter={formatPace}
              label={{ value: 'Pace (min/km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="cadence"
              domain={['dataMin - 5', 'dataMax + 5']}
              label={{ value: 'Cadence (spm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'cadence' ? `${value.toFixed(0)} spm` : formatPace(value) + '/km',
                name === 'cadence' ? 'Cadence' : 'Pace',
              ]}
            />
            <Scatter data={scatterData.filter(d => d.cadence !== null)} fill="#f59e0b" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Vertical Ratio vs Pace */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          Vertical Ratio vs Pace
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.vrSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Lower VR at all paces indicates better running economy
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="pace"
              type="number"
              domain={[minPace - 0.3, maxPace + 0.3]}
              ticks={paceTicks}
              tickFormatter={formatPace}
              label={{ value: 'Pace (min/km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="vr"
              domain={['dataMin - 1', 'dataMax + 1']}
              label={{ value: 'VR (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'vr' ? `${value.toFixed(2)}%` : formatPace(value) + '/km',
                name === 'vr' ? 'Vertical Ratio' : 'Pace',
              ]}
            />
            <Scatter data={scatterData.filter(d => d.vr !== null)} fill="#8b5cf6" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Vertical Ratio over distance */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Vertical Ratio Over Distance (Efficiency)</h3>
        <p className="text-xs text-gray-500 mb-4">
          Lower is better - measures how much energy goes up vs forward
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="distance"
              tickFormatter={(v) => v.toFixed(1)}
              label={{ value: 'Distance (km)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              domain={[0, 10]}
              label={{ value: 'VR (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'VR']}
              labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
            />
            <Line type="monotone" dataKey="vr" stroke="#8b5cf6" dot={false} strokeWidth={2} />
            <ReferenceLine y={6} stroke="#10b981" strokeDasharray="5 5" label="Target" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Power over distance (if Stryd data available) */}
      {hasStrydData && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">
            Power Over Distance
            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Stryd
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.filter(d => d.power !== null && d.power > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="distance"
                tickFormatter={(v) => v.toFixed(1)}
                label={{ value: 'Distance (km)', position: 'bottom', offset: -5 }}
              />
              <YAxis
                domain={['dataMin - 20', 'dataMax + 20']}
                label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(0)} W`, 'Power']}
                labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
              />
              <Line type="monotone" dataKey="power" stroke="#9333ea" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Power vs Pace (if Stryd data available) */}
      {hasStrydData && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">
            Power vs Pace
            <span className="ml-2 text-sm font-normal text-gray-500">
              r = {correlations.powerSpeed.toFixed(3)}
            </span>
            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Stryd
            </span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Power should increase at faster paces - shows efficiency of power application
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="pace"
                name="Pace"
                type="number"
                domain={[minPace - 0.3, maxPace + 0.3]}
                ticks={paceTicks}
                tickFormatter={formatPace}
                label={{ value: 'Pace (min/km)', position: 'bottom', offset: -5 }}
              />
              <YAxis
                dataKey="power"
                name="Power"
                domain={['dataMin - 20', 'dataMax + 20']}
                label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'Power' ? `${value.toFixed(0)} W` : formatPace(value) + '/km',
                  name,
                ]}
              />
              <Scatter
                data={scatterData.filter(d => d.power !== null && d.power > 0)}
                fill="#9333ea"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Heart Rate over distance (if available) */}
      {data.summary.hr && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Heart Rate Over Distance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="distance"
                tickFormatter={(v) => v.toFixed(1)}
                label={{ value: 'Distance (km)', position: 'bottom', offset: -5 }}
              />
              <YAxis
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'HR (bpm)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(0)} bpm`, 'HR']}
                labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
              />
              <Line type="monotone" dataKey="hr" stroke="#ef4444" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
