import { useCallback, useMemo } from 'react';

export interface RangeSelection {
  startTime: number;
  endTime: number;
  startDistance: number;
  endDistance: number;
}

interface RangeSelectorProps {
  /** Total time range in seconds */
  totalTime: number;
  /** Total distance in km */
  totalDistance: number;
  /** Current selection */
  selection: RangeSelection;
  /** Callback when selection changes */
  onSelectionChange: (selection: RangeSelection) => void;
  /** Callback to reset selection to full range */
  onReset: () => void;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format distance in km with 2 decimal places
 */
function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

export function RangeSelector({
  totalTime,
  totalDistance,
  selection,
  onSelectionChange,
  onReset,
}: RangeSelectorProps) {
  const isFullRange = useMemo(
    () =>
      selection.startTime === 0 &&
      selection.endTime >= totalTime - 1 &&
      selection.startDistance === 0 &&
      selection.endDistance >= totalDistance - 0.01,
    [selection, totalTime, totalDistance]
  );

  const handleTimeStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      onSelectionChange({
        ...selection,
        startTime: Math.min(value, selection.endTime - 1),
      });
    },
    [selection, onSelectionChange]
  );

  const handleTimeEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      onSelectionChange({
        ...selection,
        endTime: Math.max(value, selection.startTime + 1),
      });
    },
    [selection, onSelectionChange]
  );

  const handleDistanceStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      onSelectionChange({
        ...selection,
        startDistance: Math.min(value, selection.endDistance - 0.01),
      });
    },
    [selection, onSelectionChange]
  );

  const handleDistanceEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      onSelectionChange({
        ...selection,
        endDistance: Math.max(value, selection.startDistance + 0.01),
      });
    },
    [selection, onSelectionChange]
  );

  // Calculate selected percentage for display
  const timePercentage = totalTime > 0
    ? (((selection.endTime - selection.startTime) / totalTime) * 100).toFixed(0)
    : '100';
  const distancePercentage = totalDistance > 0
    ? (((selection.endDistance - selection.startDistance) / totalDistance) * 100).toFixed(0)
    : '100';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Analyze Subset</h3>
        {!isFullRange && (
          <button
            onClick={onReset}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Reset to Full Range
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Time Range</label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(selection.startTime)} - {formatTime(selection.endTime)}
              <span className="ml-2 text-blue-600 dark:text-blue-400">({timePercentage}%)</span>
            </span>
          </div>

          <div className="relative pt-1">
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={totalTime}
                step={1}
                value={selection.startTime}
                onChange={handleTimeStartChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex gap-2 items-center mt-1">
              <input
                type="range"
                min={0}
                max={totalTime}
                step={1}
                value={selection.endTime}
                onChange={handleTimeEndChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>Start: {formatTime(selection.startTime)}</span>
              <span>End: {formatTime(selection.endTime)}</span>
            </div>
          </div>
        </div>

        {/* Distance Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Distance Range</label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistance(selection.startDistance)} - {formatDistance(selection.endDistance)}
              <span className="ml-2 text-blue-600 dark:text-blue-400">({distancePercentage}%)</span>
            </span>
          </div>

          <div className="relative pt-1">
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={totalDistance}
                step={0.01}
                value={selection.startDistance}
                onChange={handleDistanceStartChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
            </div>
            <div className="flex gap-2 items-center mt-1">
              <input
                type="range"
                min={0}
                max={totalDistance}
                step={0.01}
                value={selection.endDistance}
                onChange={handleDistanceEndChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>Start: {formatDistance(selection.startDistance)}</span>
              <span>End: {formatDistance(selection.endDistance)}</span>
            </div>
          </div>
        </div>
      </div>

      {!isFullRange && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Analyzing subset: {formatTime(selection.endTime - selection.startTime)} / {formatTime(totalTime)} time,{' '}
            {formatDistance(selection.endDistance - selection.startDistance)} / {formatDistance(totalDistance)} distance
          </p>
        </div>
      )}
    </div>
  );
}
