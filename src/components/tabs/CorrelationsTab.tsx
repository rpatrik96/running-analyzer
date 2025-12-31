import type { AnalysisResult } from '../../types/fit';
import { CorrelationBadge } from '../CorrelationBadge';

interface CorrelationsTabProps {
  data: AnalysisResult;
}

export function CorrelationsTab({ data }: CorrelationsTabProps) {
  const { correlations, hasStrydData } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Running Dynamics Correlations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <CorrelationBadge label="GCT vs Speed" value={correlations.gctSpeed} />
          <CorrelationBadge label="GCT vs Cadence" value={correlations.gctCadence} />
          <CorrelationBadge label="Step Length vs Speed" value={correlations.slSpeed} />
          <CorrelationBadge label="Step Length vs Cadence" value={correlations.slCadence} />
          <CorrelationBadge label="VO vs Speed" value={correlations.voSpeed} />
          <CorrelationBadge label="VR vs Speed" value={correlations.vrSpeed} />
          <CorrelationBadge label="Cadence vs Speed" value={correlations.cadenceSpeed} />
          {correlations.hrSpeed !== 0 && (
            <CorrelationBadge label="HR vs Speed" value={correlations.hrSpeed} />
          )}
        </div>
      </div>

      {hasStrydData && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Power Correlations
            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Stryd
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {correlations.powerSpeed !== 0 && (
              <CorrelationBadge label="Power vs Speed" value={correlations.powerSpeed} />
            )}
            {correlations.lssSpeed !== 0 && (
              <CorrelationBadge label="LSS vs Speed" value={correlations.lssSpeed} />
            )}
            {correlations.formPowerSpeed !== 0 && (
              <CorrelationBadge label="Form Power vs Speed" value={correlations.formPowerSpeed} />
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Interpretation Guide</h2>
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">GCT vs Speed</h3>
            <p className="text-blue-800">
              Should be <strong>strongly negative</strong> (r {'<'} -0.7). Faster running naturally
              reduces ground contact time. A weak correlation may indicate inefficient running
              mechanics that don't adapt well to pace changes.
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Step Length vs Speed</h3>
            <p className="text-green-800">
              A <strong>positive correlation</strong> indicates stride-length dominant running. You
              increase speed primarily by taking longer steps. Compare with Cadence vs Speed to
              understand your running style.
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900 mb-2">Cadence vs Speed</h3>
            <p className="text-yellow-800">
              A <strong>positive correlation</strong> indicates cadence-dominant running. Elite
              runners often maintain consistent cadence across paces and increase speed through
              stride length.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">VR vs Speed</h3>
            <p className="text-purple-800">
              Ideally <strong>negative</strong>: you become more efficient (less vertical
              oscillation relative to forward motion) at faster paces. A positive correlation may
              indicate you "bounce" more when running fast.
            </p>
          </div>

          {hasStrydData && (
            <div className="p-4 bg-pink-50 rounded-lg">
              <h3 className="font-medium text-pink-900 mb-2">LSS vs Speed</h3>
              <p className="text-pink-800">
                Leg Spring Stiffness should be <strong>positively correlated</strong> with speed.
                Higher stiffness at faster paces indicates good elastic energy return in your
                muscles and tendons.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Correlation Strength Reference</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100"></div>
            <span className="text-sm">|r| {'>'} 0.7: Strong</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100"></div>
            <span className="text-sm">0.4 {'<'} |r| {'<'} 0.7: Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100"></div>
            <span className="text-sm">|r| {'<'} 0.4: Weak</span>
          </div>
        </div>
      </div>
    </div>
  );
}
