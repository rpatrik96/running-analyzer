/**
 * Statistical utilities for running data analysis
 */

/**
 * Calculate the arithmetic mean of an array
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate the sample standard deviation
 */
export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let numerator = 0;
  let sumDxSq = 0;
  let sumDySq = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    numerator += dx * dy;
    sumDxSq += dx * dx;
    sumDySq += dy * dy;
  }

  const denominator = Math.sqrt(sumDxSq * sumDySq);
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Calculate percentile of an array
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - idx) + sorted[upper] * (idx - lower);
}

/**
 * Calculate min and max
 */
export function minMax(arr: number[]): { min: number; max: number } {
  if (arr.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
  };
}

/**
 * Calculate coefficient of variation (CV = std/mean * 100)
 */
export function coefficientOfVariation(arr: number[]): number {
  const m = mean(arr);
  if (m === 0) return 0;
  return (std(arr) / m) * 100;
}

/**
 * Moving average with specified window size
 */
export function movingAverage(arr: number[], windowSize: number): number[] {
  if (arr.length < windowSize) return arr;

  const result: number[] = [];
  let sum = 0;

  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= windowSize) {
      sum -= arr[i - windowSize];
    }
    if (i >= windowSize - 1) {
      result.push(sum / windowSize);
    }
  }

  return result;
}

/**
 * Linear regression: returns slope, intercept, and r-squared
 */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = my - slope * mx;
  const rSquared = ssXX > 0 && ssYY > 0 ? Math.pow(ssXY, 2) / (ssXX * ssYY) : 0;

  return { slope, intercept, rSquared };
}

/**
 * Format a correlation value for display
 */
export function formatCorrelation(r: number): { value: string; strength: string; color: string } {
  const absR = Math.abs(r);
  let strength: string;
  let color: string;

  if (absR >= 0.7) {
    strength = 'Strong';
    color = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
  } else if (absR >= 0.4) {
    strength = 'Moderate';
    color = 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
  } else {
    strength = 'Weak';
    color = 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
  }

  return {
    value: r.toFixed(3),
    strength,
    color,
  };
}
