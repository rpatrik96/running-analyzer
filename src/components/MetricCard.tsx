interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  target?: string;
  good?: boolean;
}

export function MetricCard({ label, value, unit, subValue, target, good }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold ${good ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400 dark:text-gray-500">{unit}</span>}
      </div>
      {subValue && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</div>}
      {target && <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Target: {target}</div>}
    </div>
  );
}
