// FIT file data types

export interface FITHeader {
  headerSize: number;
  protocolVersion: number;
  profileVersion: number;
  dataSize: number;
}

export interface FITFieldDefinition {
  fieldDefNum: number;
  fieldSize: number;
  baseType: number;
}

export interface FITDevFieldDefinition {
  fieldNum: number;
  size: number;
  devDataIndex: number;
}

export interface FITMessageDefinition {
  globalMessageNumber: number;
  fields: FITFieldDefinition[];
  devFields: FITDevFieldDefinition[];
  size: number;
  isLittleEndian: boolean;
}

export interface FITDeveloperField {
  developerDataIndex: number;
  fieldDefinitionNumber: number;
  fitBaseTypeId: number;
  fieldName: string;
  units: string;
  nativeFieldNum?: number;
}

// Raw record from FIT file
export interface FITRecord {
  messageType: number;
  timestamp?: number;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  cadence?: number;
  fractional_cadence?: number;
  distance?: number;
  speed?: number;
  enhanced_speed?: number;
  power?: number;
  vertical_oscillation?: number;
  stance_time_percent?: number;
  stance_time?: number;
  left_right_balance?: number;
  vertical_ratio?: number;
  stance_time_balance?: number;
  step_length?: number;
  // Alternate field locations (some Garmin devices use these)
  vertical_ratio_alt?: number;
  stance_time_balance_alt?: number;
  step_length_alt?: number;
  // Stryd-specific fields (developer fields)
  stryd_power?: number;
  form_power?: number;
  leg_spring_stiffness?: number;
  air_power?: number;
  ground_time?: number;
  vertical_oscillation_stryd?: number;
  cadence_stryd?: number;
  elevation?: number;
  impact_loading_rate?: number;
  braking_impulse?: number;
  footstrike_type?: number;
  pronation_excursion?: number;
  [key: string]: number | undefined; // For other developer fields
}

// Processed running data point
export interface RunningDataPoint {
  idx: number;
  timestamp: number;
  distance: number;
  speed: number;
  pace: number | null;
  gct: number;
  vo: number | null;
  sl: number | null;
  cadence: number | null;
  vr: number | null;
  gctBalance: number | null;
  hr: number | null;
  power: number | null;
  formPower: number | null;
  formPowerRatio: number | null; // Form Power / Total Power * 100
  lss: number | null;
  airPower: number | null;
  altitude: number | null;
  impactLoadingRate: number | null;
  brakingImpulse: number | null;
  impactGs: number | null; // Impact measured in g-force
}

// Statistics for a metric
export interface MetricStats {
  mean: string;
  std: string;
  min?: number;
  max?: number;
}

// Correlation results
export interface Correlations {
  gctSpeed: number;
  gctCadence: number;
  slSpeed: number;
  slCadence: number;
  voSpeed: number;
  vrSpeed: number;
  powerSpeed: number;
  lssSpeed: number;
  formPowerSpeed: number;
  hrSpeed: number;
  cadenceSpeed: number;
}

// Pace bin analysis
export interface PaceBin {
  pace: string;
  paceNum: number;
  gct: number;
  vo: string;
  cadence: number;
  sl: number;
  vr: string;
  power?: number;
  formPower?: number;
  lss?: string;
  count: number;
}

// Split analysis
export interface SplitMetrics {
  gct: number;
  vo: number;
  cadence: number;
  vr: number;
  power?: number;
  formPower?: number;
  lss?: number;
  hr?: number;
}

export interface SplitAnalysis {
  firstQuarter: SplitMetrics;
  lastQuarter: SplitMetrics;
}

// Summary metrics
export interface Summary {
  duration: number;
  distance: string;
  avgPace: string;
  avgSpeed: string;
  gct: MetricStats;
  vo: MetricStats;
  sl: MetricStats;
  cadence: MetricStats;
  vr: MetricStats;
  gctBalance: string;
  hr: { mean: string; max: number } | null;
  power: MetricStats | null;
  formPower: MetricStats | null;
  formPowerRatio: MetricStats | null; // Form Power / Total Power * 100
  lss: MetricStats | null;
  airPower: MetricStats | null;
  impactLoadingRate: MetricStats | null;
  impactGs: MetricStats | null; // Impact in g-force
}

// Complete analysis result
export interface AnalysisResult {
  summary: Summary;
  correlations: Correlations;
  paceBins: PaceBin[];
  splitAnalysis: SplitAnalysis;
  processed: RunningDataPoint[];
  hasStrydData: boolean;
  hasRunningDynamics: boolean;
}
