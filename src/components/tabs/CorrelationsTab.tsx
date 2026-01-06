import type { AnalysisResult } from '../../types/fit';
import { CorrelationBadge } from '../CorrelationBadge';

interface CorrelationsTabProps {
  data: AnalysisResult;
}

export function CorrelationsTab({ data }: CorrelationsTabProps) {
  const { correlations, hasStrydData } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Running Dynamics Correlations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CorrelationBadge
            label="GCT vs Speed"
            value={correlations.gctSpeed}
            interpretation="Should be strongly negative (r < -0.7). Faster running naturally reduces ground contact time. A weak correlation may indicate inefficient running mechanics."
          />
          <CorrelationBadge
            label="GCT vs Cadence"
            value={correlations.gctCadence}
            interpretation="Typically negative: higher cadence means less time on the ground per step."
          />
          <CorrelationBadge
            label="Step Length vs Speed"
            value={correlations.slSpeed}
            interpretation="A positive correlation indicates stride-length dominant running. You increase speed primarily by taking longer steps."
          />
          <CorrelationBadge
            label="Step Length vs Cadence"
            value={correlations.slCadence}
            interpretation="Shows how step length and cadence interact. A negative correlation is common as runners trade off between the two."
          />
          <CorrelationBadge
            label="VO vs Speed"
            value={correlations.voSpeed}
            interpretation="Vertical oscillation often increases with speed. Very strong positive may indicate bouncy running form."
          />
          <CorrelationBadge
            label="VR vs Speed"
            value={correlations.vrSpeed}
            interpretation="Ideally negative: you become more efficient (less vertical oscillation relative to forward motion) at faster paces."
          />
          <CorrelationBadge
            label="Cadence vs Speed"
            value={correlations.cadenceSpeed}
            interpretation="A positive correlation indicates cadence-dominant running. Elite runners often maintain consistent cadence and increase speed through stride length."
          />
          {correlations.hrSpeed !== 0 && (
            <CorrelationBadge
              label="HR vs Speed"
              value={correlations.hrSpeed}
              interpretation="Typically positive: faster running requires more effort. A weak correlation may indicate cardiac drift or variable intensity."
            />
          )}
        </div>
      </div>

      {hasStrydData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Power Correlations
            <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
              Stryd
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {correlations.powerSpeed !== 0 && (
              <CorrelationBadge
                label="Power vs Speed"
                value={correlations.powerSpeed}
                interpretation="Should be strongly positive. Power output increases with speed. A weak correlation may indicate pacing inconsistencies."
              />
            )}
            {correlations.lssSpeed !== 0 && (
              <CorrelationBadge
                label="LSS vs Speed"
                value={correlations.lssSpeed}
                interpretation="Leg Spring Stiffness should be positively correlated with speed. Higher stiffness at faster paces indicates good elastic energy return."
              />
            )}
            {correlations.formPowerSpeed !== 0 && (
              <CorrelationBadge
                label="Form Power vs Speed"
                value={correlations.formPowerSpeed}
                interpretation="Form power (energy lost to vertical movement) typically increases with speed but should be a smaller proportion of total power."
              />
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Correlation Strength Reference</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">|r| {'>'} 0.7: Strong</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">0.4 {'<'} |r| {'<'} 0.7: Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">|r| {'<'} 0.4: Weak</span>
          </div>
        </div>
      </div>
    </div>
  );
}
