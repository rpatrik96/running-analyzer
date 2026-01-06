import type { AnalysisResult } from '../../types/fit';

interface SplitsTabProps {
  data: AnalysisResult;
}

interface SplitMetricRow {
  key: string;
  label: string;
  unit: string;
  lowerBetter: boolean;
  threshold: number;
}

export function SplitsTab({ data }: SplitsTabProps) {
  const { splitAnalysis, hasStrydData } = data;

  const metrics: SplitMetricRow[] = [
    { key: 'gct', label: 'GCT', unit: 'ms', lowerBetter: true, threshold: 5 },
    { key: 'vo', label: 'Vertical Oscillation', unit: 'cm', lowerBetter: true, threshold: 0.3 },
    { key: 'cadence', label: 'Cadence', unit: 'spm', lowerBetter: false, threshold: 3 },
    { key: 'vr', label: 'Vertical Ratio', unit: '%', lowerBetter: true, threshold: 0.5 },
  ];

  if (hasStrydData) {
    if (splitAnalysis.firstQuarter.power !== undefined) {
      metrics.push({ key: 'power', label: 'Power', unit: 'W', lowerBetter: false, threshold: 10 });
    }
    if (splitAnalysis.firstQuarter.formPower !== undefined) {
      metrics.push({
        key: 'formPower',
        label: 'Form Power',
        unit: 'W',
        lowerBetter: true,
        threshold: 5,
      });
    }
    if (splitAnalysis.firstQuarter.lss !== undefined) {
      metrics.push({
        key: 'lss',
        label: 'Leg Spring Stiffness',
        unit: 'kN/m',
        lowerBetter: false,
        threshold: 0.5,
      });
    }
  }

  if (splitAnalysis.firstQuarter.hr !== undefined) {
    metrics.push({ key: 'hr', label: 'Heart Rate', unit: 'bpm', lowerBetter: false, threshold: 5 });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Fatigue Analysis (First vs Last Quarter)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Compares running metrics from the first 25% to the last 25% of your run to assess fatigue
          impact.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-gray-900 dark:text-gray-100">Metric</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-gray-100">First Quarter</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-gray-100">Last Quarter</th>
                <th className="text-right py-3 px-4 text-gray-900 dark:text-gray-100">Change</th>
                <th className="text-center py-3 px-4 text-gray-900 dark:text-gray-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(({ key, label, unit, lowerBetter, threshold }) => {
                const first =
                  splitAnalysis.firstQuarter[key as keyof typeof splitAnalysis.firstQuarter];
                const last =
                  splitAnalysis.lastQuarter[key as keyof typeof splitAnalysis.lastQuarter];

                if (first === undefined || last === undefined) return null;

                const change = (last as number) - (first as number);
                const isGood = lowerBetter ? change <= threshold : change >= -threshold;
                const isExcellent = lowerBetter ? change <= 0 : change >= 0;

                return (
                  <tr key={key} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{label}</td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {(first as number).toFixed(1)} {unit}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {(last as number).toFixed(1)} {unit}
                    </td>
                    <td
                      className={`text-right py-3 px-4 font-medium ${
                        isExcellent
                          ? 'text-green-600 dark:text-green-400'
                          : isGood
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(1)} {unit}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isExcellent ? (
                        <span className="text-green-600 dark:text-green-400">Excellent</span>
                      ) : isGood ? (
                        <span className="text-yellow-600 dark:text-yellow-400">OK</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">Degraded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Fatigue Resistance Assessment</h2>
        <div className="space-y-4">
          {(() => {
            const gctChange = splitAnalysis.lastQuarter.gct - splitAnalysis.firstQuarter.gct;
            const cadenceChange =
              splitAnalysis.lastQuarter.cadence - splitAnalysis.firstQuarter.cadence;
            const vrChange = splitAnalysis.lastQuarter.vr - splitAnalysis.firstQuarter.vr;

            const score =
              (gctChange < 5 ? 1 : 0) + (cadenceChange > -3 ? 1 : 0) + (vrChange < 0.5 ? 1 : 0);

            let assessment: { level: string; color: string; description: string };

            if (score === 3) {
              assessment = {
                level: 'Excellent',
                color: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300',
                description:
                  'Your running form remained stable throughout the run. Minimal fatigue impact on mechanics.',
              };
            } else if (score === 2) {
              assessment = {
                level: 'Good',
                color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
                description:
                  'Minor form degradation detected. Your mechanics held up well under fatigue.',
              };
            } else if (score === 1) {
              assessment = {
                level: 'Fair',
                color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-300',
                description:
                  'Noticeable form changes in the final quarter. Consider pacing or endurance training.',
              };
            } else {
              assessment = {
                level: 'Needs Work',
                color: 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
                description:
                  'Significant form degradation. Focus on building endurance and strength to maintain mechanics.',
              };
            }

            return (
              <div className={`p-4 rounded-lg border-l-4 ${assessment.color}`}>
                <div className="font-semibold text-lg mb-2">
                  Fatigue Resistance: {assessment.level}
                </div>
                <p>{assessment.description}</p>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What This Means</h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong className="text-gray-900 dark:text-gray-100">GCT increase:</strong> Rising ground contact time indicates neuromuscular
            fatigue. Your muscles and nervous system are less able to produce the quick, powerful
            ground contacts needed for efficient running.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Cadence drop:</strong> Decreasing cadence often accompanies fatigue as your
            neural drive decreases. Maintaining cadence while tired requires conscious effort and
            good training.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">VR increase:</strong> A rising vertical ratio means you're "bouncing" more - a
            sign that your stabilizing muscles are fatiguing and you're losing horizontal
            propulsion efficiency.
          </p>
          {hasStrydData && (
            <p>
              <strong className="text-gray-900 dark:text-gray-100">LSS decrease:</strong> Dropping leg spring stiffness indicates reduced elastic
              energy return from your tendons and muscles - they're no longer snapping back as
              efficiently.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
