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

export function ChartsTab({ data }: ChartsTabProps) {
  const { processed, correlations, hasStrydData } = data;

  // Downsample for better performance
  const chartData = processed.filter((_, i) => i % 5 === 0);
  const scatterData = processed.filter((_, i) => i % 3 === 0);

  return (
    <div className="space-y-6">
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

      {/* GCT vs Speed */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          GCT vs Speed
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.gctSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Should be strongly negative (faster pace = less ground contact time)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="speed"
              name="Speed"
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
              label={{ value: 'Speed (m/s)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="gct"
              name="GCT"
              domain={['dataMin - 10', 'dataMax + 10']}
              label={{ value: 'GCT (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'GCT' ? `${value.toFixed(0)} ms` : `${value.toFixed(2)} m/s`,
                name,
              ]}
            />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Step Length vs Speed */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          Step Length vs Speed
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.slSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Positive correlation indicates stride-length dominant running style
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="speed"
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
              label={{ value: 'Speed (m/s)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="sl"
              domain={['dataMin - 50', 'dataMax + 50']}
              label={{ value: 'Step Length (mm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'sl' ? `${value.toFixed(0)} mm` : `${value.toFixed(2)} m/s`,
                name === 'sl' ? 'Step Length' : 'Speed',
              ]}
            />
            <Scatter data={scatterData} fill="#10b981" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Cadence vs Speed */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">
          Cadence vs Speed
          <span className="ml-2 text-sm font-normal text-gray-500">
            r = {correlations.cadenceSpeed.toFixed(3)}
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Positive correlation indicates cadence-dominant running style
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="speed"
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
              label={{ value: 'Speed (m/s)', position: 'bottom', offset: -5 }}
            />
            <YAxis
              dataKey="cadence"
              domain={['dataMin - 5', 'dataMax + 5']}
              label={{ value: 'Cadence (spm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'cadence' ? `${value.toFixed(0)} spm` : `${value.toFixed(2)} m/s`,
                name === 'cadence' ? 'Cadence' : 'Speed',
              ]}
            />
            <Scatter data={scatterData} fill="#f59e0b" fillOpacity={0.6} />
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
            <LineChart data={chartData}>
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
              <Line type="monotone" dataKey="power" stroke="#9333ea" dot={false} strokeWidth={2} />
            </LineChart>
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
