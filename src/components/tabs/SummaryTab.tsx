import type { AnalysisResult } from '../../types/fit';
import { MetricCard } from '../MetricCard';
import { BalanceIndicator } from '../BalanceIndicator';

interface SummaryTabProps {
  data: AnalysisResult;
}

export function SummaryTab({ data }: SummaryTabProps) {
  const { summary, paceBins, hasStrydData } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Distance" value={summary.distance} unit="km" />
        <MetricCard label="Avg Pace" value={summary.avgPace} unit="/km" />
        <MetricCard
          label="Duration"
          value={Math.round(summary.duration / 60)}
          unit="min"
          subValue={`${summary.duration} records`}
        />
        {summary.hr && (
          <MetricCard
            label="Avg HR"
            value={summary.hr.mean}
            unit="bpm"
            subValue={`Max: ${summary.hr.max}`}
          />
        )}
      </div>

      {/* Running Dynamics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Running Dynamics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Ground Contact Time"
            value={summary.gct.mean}
            unit="ms"
            subValue={`\u00b1 ${summary.gct.std}`}
            target="<240ms"
            good={parseFloat(summary.gct.mean) < 240}
          />
          <MetricCard
            label="Vertical Oscillation"
            value={summary.vo.mean}
            unit="cm"
            subValue={`\u00b1 ${summary.vo.std}`}
            target="<6cm"
            good={parseFloat(summary.vo.mean) < 6}
          />
          <MetricCard
            label="Cadence"
            value={summary.cadence.mean}
            unit="spm"
            subValue={`\u00b1 ${summary.cadence.std}`}
            target=">180"
            good={parseFloat(summary.cadence.mean) > 180}
          />
          <MetricCard
            label="Step Length"
            value={summary.sl.mean}
            unit="mm"
            subValue={`\u00b1 ${summary.sl.std}`}
          />
          <MetricCard
            label="Vertical Ratio"
            value={summary.vr.mean}
            unit="%"
            subValue={`\u00b1 ${summary.vr.std}`}
            target="<6%"
            good={parseFloat(summary.vr.mean) < 6}
          />
        </div>
      </div>

      {/* Stryd Metrics */}
      {hasStrydData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Power Metrics
            <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
              Stryd
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.power && (
              <MetricCard
                label="Running Power"
                value={summary.power.mean}
                unit="W"
                subValue={`\u00b1 ${summary.power.std}`}
              />
            )}
            {summary.formPower && (
              <MetricCard
                label="Form Power"
                value={summary.formPower.mean}
                unit="W"
                subValue={`\u00b1 ${summary.formPower.std}`}
                target="<80W"
                good={parseFloat(summary.formPower.mean) < 80}
              />
            )}
            {summary.formPowerRatio && (
              <MetricCard
                label="Form Power Ratio"
                value={summary.formPowerRatio.mean}
                unit="%"
                subValue={`\u00b1 ${summary.formPowerRatio.std}`}
                target="<25%"
                good={parseFloat(summary.formPowerRatio.mean) < 25}
              />
            )}
            {summary.lss && (
              <MetricCard
                label="Leg Spring Stiffness"
                value={summary.lss.mean}
                unit="kN/m"
                subValue={`\u00b1 ${summary.lss.std}`}
                target=">9"
                good={parseFloat(summary.lss.mean) > 9}
              />
            )}
            {summary.airPower && (
              <MetricCard
                label="Air Power"
                value={summary.airPower.mean}
                unit="W"
                subValue={`\u00b1 ${summary.airPower.std}`}
              />
            )}
            {summary.impactGs && (
              <MetricCard
                label="Impact GS"
                value={summary.impactGs.mean}
                unit="g"
                subValue={`\u00b1 ${summary.impactGs.std}`}
              />
            )}
            {summary.impactLoadingRate && (
              <MetricCard
                label="Impact Loading Rate"
                value={summary.impactLoadingRate.mean}
                unit="BW/s"
                subValue={`\u00b1 ${summary.impactLoadingRate.std}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Balance */}
      {summary.gctBalance !== 'N/A' && <BalanceIndicator balance={summary.gctBalance} />}

      {/* Pace Bins Table */}
      {paceBins.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Metrics by Pace</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-gray-900 dark:text-gray-100">Pace</th>
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">GCT</th>
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">VO</th>
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">Cadence</th>
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">SL</th>
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">VR</th>
                {hasStrydData && (
                  <>
                    <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">Power</th>
                    <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">LSS</th>
                  </>
                )}
                <th className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">n</th>
              </tr>
            </thead>
            <tbody>
              {paceBins.map((bin, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{bin.pace}/km</td>
                  <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.gct} ms</td>
                  <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.vo} cm</td>
                  <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.cadence}</td>
                  <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.sl} mm</td>
                  <td
                    className={`text-right py-2 px-3 ${
                      parseFloat(bin.vr) < 6 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {bin.vr}%
                  </td>
                  {hasStrydData && (
                    <>
                      <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.power ?? '-'} W</td>
                      <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{bin.lss ?? '-'}</td>
                    </>
                  )}
                  <td className="text-right py-2 px-3 text-gray-400 dark:text-gray-500">{bin.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
