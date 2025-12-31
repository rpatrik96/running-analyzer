import { formatCorrelation } from '../lib/statistics';

interface CorrelationBadgeProps {
  label: string;
  value: number;
  interpretation?: string;
}

export function CorrelationBadge({ label, value, interpretation }: CorrelationBadgeProps) {
  const { value: formattedValue, strength, color } = formatCorrelation(value);

  return (
    <div className={`px-4 py-3 rounded-lg ${color} flex flex-col`}>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="font-mono font-semibold text-lg">r = {formattedValue}</div>
      <div className="text-xs mt-1">{strength}</div>
      {interpretation && (
        <div className="text-xs mt-3 pt-3 border-t border-current border-opacity-20 opacity-80 leading-relaxed">
          {interpretation}
        </div>
      )}
    </div>
  );
}
