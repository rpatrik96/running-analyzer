import { formatCorrelation } from '../lib/statistics';

interface CorrelationBadgeProps {
  label: string;
  value: number;
}

export function CorrelationBadge({ label, value }: CorrelationBadgeProps) {
  const { value: formattedValue, strength, color } = formatCorrelation(value);

  return (
    <div className={`px-4 py-3 rounded-lg ${color}`}>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="font-mono font-semibold text-lg">r = {formattedValue}</div>
      <div className="text-xs mt-1">{strength}</div>
    </div>
  );
}
