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
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold ${good ? 'text-green-600' : 'text-gray-900'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
      {target && <div className="text-xs text-blue-500 mt-1">Target: {target}</div>}
    </div>
  );
}
