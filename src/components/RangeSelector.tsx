import { useCallback, useMemo, useState, useEffect } from 'react';

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
 * Parse time string (MM:SS or HH:MM:SS) to seconds
 * Returns null if invalid format
 */
function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim();

  // Match MM:SS or HH:MM:SS format
  const match = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;

  const parts = match.slice(1).filter(Boolean).map(Number);

  if (parts.length === 2) {
    // MM:SS format
    const [mins, secs] = parts;
    if (secs >= 60) return null;
    return mins * 60 + secs;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, mins, secs] = parts;
    if (mins >= 60 || secs >= 60) return null;
    return hours * 3600 + mins * 60 + secs;
  }

  return null;
}

/**
 * Format distance in km with 2 decimal places
 */
function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

/**
 * Format distance for input (just the number)
 */
function formatDistanceForInput(km: number): string {
  return km.toFixed(2);
}

/**
 * Parse distance string to km
 * Accepts formats like "5.5", "5.5 km", "5.5km"
 * Returns null if invalid
 */
function parseDistance(distStr: string): number | null {
  const trimmed = distStr.trim().toLowerCase().replace(/\s*km\s*$/, '');
  const value = parseFloat(trimmed);

  if (isNaN(value) || value < 0) return null;
  return value;
}

export function RangeSelector({
  totalTime,
  totalDistance,
  selection,
  onSelectionChange,
  onReset,
}: RangeSelectorProps) {
  // Text input states - allow editing without immediately updating selection
  const [startTimeInput, setStartTimeInput] = useState(formatTime(selection.startTime));
  const [endTimeInput, setEndTimeInput] = useState(formatTime(selection.endTime));
  const [startDistanceInput, setStartDistanceInput] = useState(formatDistanceForInput(selection.startDistance));
  const [endDistanceInput, setEndDistanceInput] = useState(formatDistanceForInput(selection.endDistance));

  // Input validation error states
  const [startTimeError, setStartTimeError] = useState(false);
  const [endTimeError, setEndTimeError] = useState(false);
  const [startDistanceError, setStartDistanceError] = useState(false);
  const [endDistanceError, setEndDistanceError] = useState(false);

  // Sync text inputs when selection changes externally (e.g., from sliders or reset)
  useEffect(() => {
    setStartTimeInput(formatTime(selection.startTime));
    setStartTimeError(false);
  }, [selection.startTime]);

  useEffect(() => {
    setEndTimeInput(formatTime(selection.endTime));
    setEndTimeError(false);
  }, [selection.endTime]);

  useEffect(() => {
    setStartDistanceInput(formatDistanceForInput(selection.startDistance));
    setStartDistanceError(false);
  }, [selection.startDistance]);

  useEffect(() => {
    setEndDistanceInput(formatDistanceForInput(selection.endDistance));
    setEndDistanceError(false);
  }, [selection.endDistance]);

  const isFullRange = useMemo(
    () =>
      selection.startTime === 0 &&
      selection.endTime >= totalTime - 1 &&
      selection.startDistance === 0 &&
      selection.endDistance >= totalDistance - 0.01,
    [selection, totalTime, totalDistance]
  );

  // Slider handlers
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

  // Text input handlers - commit on blur or Enter
  const commitStartTime = useCallback(() => {
    const parsed = parseTime(startTimeInput);
    if (parsed === null || parsed < 0 || parsed > totalTime) {
      setStartTimeError(true);
      setStartTimeInput(formatTime(selection.startTime));
      return;
    }
    if (parsed >= selection.endTime) {
      setStartTimeError(true);
      setStartTimeInput(formatTime(selection.startTime));
      return;
    }
    setStartTimeError(false);
    onSelectionChange({ ...selection, startTime: parsed });
  }, [startTimeInput, totalTime, selection, onSelectionChange]);

  const commitEndTime = useCallback(() => {
    const parsed = parseTime(endTimeInput);
    if (parsed === null || parsed < 0 || parsed > totalTime) {
      setEndTimeError(true);
      setEndTimeInput(formatTime(selection.endTime));
      return;
    }
    if (parsed <= selection.startTime) {
      setEndTimeError(true);
      setEndTimeInput(formatTime(selection.endTime));
      return;
    }
    setEndTimeError(false);
    onSelectionChange({ ...selection, endTime: parsed });
  }, [endTimeInput, totalTime, selection, onSelectionChange]);

  const commitStartDistance = useCallback(() => {
    const parsed = parseDistance(startDistanceInput);
    if (parsed === null || parsed < 0 || parsed > totalDistance) {
      setStartDistanceError(true);
      setStartDistanceInput(formatDistanceForInput(selection.startDistance));
      return;
    }
    if (parsed >= selection.endDistance) {
      setStartDistanceError(true);
      setStartDistanceInput(formatDistanceForInput(selection.startDistance));
      return;
    }
    setStartDistanceError(false);
    onSelectionChange({ ...selection, startDistance: parsed });
  }, [startDistanceInput, totalDistance, selection, onSelectionChange]);

  const commitEndDistance = useCallback(() => {
    const parsed = parseDistance(endDistanceInput);
    if (parsed === null || parsed < 0 || parsed > totalDistance) {
      setEndDistanceError(true);
      setEndDistanceInput(formatDistanceForInput(selection.endDistance));
      return;
    }
    if (parsed <= selection.startDistance) {
      setEndDistanceError(true);
      setEndDistanceInput(formatDistanceForInput(selection.endDistance));
      return;
    }
    setEndDistanceError(false);
    onSelectionChange({ ...selection, endDistance: parsed });
  }, [endDistanceInput, totalDistance, selection, onSelectionChange]);

  const handleKeyDown = (e: React.KeyboardEvent, commitFn: () => void) => {
    if (e.key === 'Enter') {
      commitFn();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Calculate selected percentage for display
  const timePercentage = totalTime > 0
    ? (((selection.endTime - selection.startTime) / totalTime) * 100).toFixed(0)
    : '100';
  const distancePercentage = totalDistance > 0
    ? (((selection.endDistance - selection.startDistance) / totalDistance) * 100).toFixed(0)
    : '100';

  const inputBaseClass = "w-20 px-2 py-1 text-xs text-center rounded border focus:outline-none focus:ring-1";
  const inputNormalClass = `${inputBaseClass} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500`;
  const inputErrorClass = `${inputBaseClass} border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 focus:ring-red-500 focus:border-red-500`;

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
            <span className="text-xs text-blue-600 dark:text-blue-400">({timePercentage}%)</span>
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
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Start:</span>
                <input
                  type="text"
                  value={startTimeInput}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  onBlur={commitStartTime}
                  onKeyDown={(e) => handleKeyDown(e, commitStartTime)}
                  placeholder="MM:SS"
                  className={startTimeError ? inputErrorClass : inputNormalClass}
                  title="Format: MM:SS or HH:MM:SS"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">End:</span>
                <input
                  type="text"
                  value={endTimeInput}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  onBlur={commitEndTime}
                  onKeyDown={(e) => handleKeyDown(e, commitEndTime)}
                  placeholder="MM:SS"
                  className={endTimeError ? inputErrorClass : inputNormalClass}
                  title="Format: MM:SS or HH:MM:SS"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Distance Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Distance Range</label>
            <span className="text-xs text-blue-600 dark:text-blue-400">({distancePercentage}%)</span>
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
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Start:</span>
                <input
                  type="text"
                  value={startDistanceInput}
                  onChange={(e) => setStartDistanceInput(e.target.value)}
                  onBlur={commitStartDistance}
                  onKeyDown={(e) => handleKeyDown(e, commitStartDistance)}
                  placeholder="0.00"
                  className={startDistanceError ? inputErrorClass : inputNormalClass}
                  title="Distance in km (e.g., 5.5 or 5.5 km)"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">km</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">End:</span>
                <input
                  type="text"
                  value={endDistanceInput}
                  onChange={(e) => setEndDistanceInput(e.target.value)}
                  onBlur={commitEndDistance}
                  onKeyDown={(e) => handleKeyDown(e, commitEndDistance)}
                  placeholder="0.00"
                  className={endDistanceError ? inputErrorClass : inputNormalClass}
                  title="Distance in km (e.g., 10.0 or 10 km)"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">km</span>
              </div>
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
