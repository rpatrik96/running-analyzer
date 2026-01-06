import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseFITFile } from './lib/fit-parser';
import { processRecords, calculateMetrics, analyzeRawRecords, type ParseDebugInfo } from './lib/data-processor';
import type { AnalysisResult, RunningDataPoint } from './types/fit';
import { FileUpload } from './components/FileUpload';
import { RangeSelector, type RangeSelection } from './components/RangeSelector';
import { SummaryTab } from './components/tabs/SummaryTab';
import { ChartsTab } from './components/tabs/ChartsTab';
import { CorrelationsTab } from './components/tabs/CorrelationsTab';
import { SplitsTab } from './components/tabs/SplitsTab';

type TabType = 'summary' | 'charts' | 'correlations' | 'splits';

const TABS: { id: TabType; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'charts', label: 'Charts' },
  { id: 'correlations', label: 'Correlations' },
  { id: 'splits', label: 'Splits' },
];

function App() {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [fullProcessedData, setFullProcessedData] = useState<RunningDataPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<ParseDebugInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rangeSelection, setRangeSelection] = useState<RangeSelection | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored !== null ? stored === 'true' : true;
  });

  // Apply dark mode class to document and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Calculate total time and distance from full data
  const { totalTime, totalDistance } = useMemo(() => {
    if (!fullProcessedData || fullProcessedData.length === 0) {
      return { totalTime: 0, totalDistance: 0 };
    }
    const firstPoint = fullProcessedData[0];
    const lastPoint = fullProcessedData[fullProcessedData.length - 1];
    return {
      totalTime: lastPoint.timestamp - firstPoint.timestamp,
      totalDistance: lastPoint.distance,
    };
  }, [fullProcessedData]);

  // Initialize range selection when data loads
  const initializeRangeSelection = useCallback((processed: RunningDataPoint[]) => {
    if (processed.length === 0) return;
    const firstPoint = processed[0];
    const lastPoint = processed[processed.length - 1];
    setRangeSelection({
      startTime: 0,
      endTime: lastPoint.timestamp - firstPoint.timestamp,
      startDistance: 0,
      endDistance: lastPoint.distance,
    });
  }, []);

  // Filter data based on range selection and recalculate metrics
  const handleRangeChange = useCallback(
    (selection: RangeSelection) => {
      setRangeSelection(selection);

      if (!fullProcessedData || fullProcessedData.length === 0) return;

      const firstTimestamp = fullProcessedData[0].timestamp;

      // Filter by both time and distance
      const filtered = fullProcessedData.filter((point) => {
        const relativeTime = point.timestamp - firstTimestamp;
        return (
          relativeTime >= selection.startTime &&
          relativeTime <= selection.endTime &&
          point.distance >= selection.startDistance &&
          point.distance <= selection.endDistance
        );
      });

      if (filtered.length < 10) {
        setError('Selected range contains too few data points. Please expand the selection.');
        return;
      }

      setError(null);
      const metrics = calculateMetrics(filtered);
      if (metrics) {
        setData(metrics);
      }
    },
    [fullProcessedData]
  );

  // Reset to full range
  const handleResetRange = useCallback(() => {
    if (!fullProcessedData) return;
    initializeRangeSelection(fullProcessedData);
    const metrics = calculateMetrics(fullProcessedData);
    if (metrics) {
      setData(metrics);
      setError(null);
    }
  }, [fullProcessedData, initializeRangeSelection]);

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    setFileName(file.name);
    setFullProcessedData(null);
    setRangeSelection(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const records = await parseFITFile(arrayBuffer);

      // Analyze raw records for debugging
      const debug = analyzeRawRecords(records);
      setDebugInfo(debug);

      if (records.length === 0) {
        throw new Error('No record messages found in FIT file. This may not be a valid activity file.');
      }

      if (debug.recordsWithSpeed === 0) {
        throw new Error(
          `No speed data found in ${records.length} records. This file may not contain running/activity data.`
        );
      }

      const processed = processRecords(records);

      if (processed.length < 10) {
        const details = [
          `Total records: ${debug.totalRecords}`,
          `Records with speed: ${debug.recordsWithSpeed}`,
          debug.speedRange ? `Speed range: ${debug.speedRange.min.toFixed(2)} - ${debug.speedRange.max.toFixed(2)} m/s` : 'No speed data',
        ].join('. ');

        throw new Error(
          `Not enough valid data points (${processed.length}). ${details}. ` +
          `Speed must be > 0.5 m/s to be considered running.`
        );
      }

      const metrics = calculateMetrics(processed);

      if (!metrics) {
        throw new Error('Failed to calculate metrics from the running data');
      }

      // Store full data and initialize range selection
      setFullProcessedData(processed);
      initializeRangeSelection(processed);
      setData(metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse FIT file');
      setData(null);
      setFullProcessedData(null);
      setRangeSelection(null);
    } finally {
      setLoading(false);
    }
  }, [initializeRangeSelection]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <h1 className="text-2xl font-bold mb-2">Running Dynamics Analyzer</h1>
          <p className="text-blue-100">
            Upload a FIT file to analyze your running form metrics from Garmin & Stryd
          </p>
        </header>

        {/* File Upload */}
        <div className="mb-6">
          <FileUpload onFileSelect={handleFileSelect} loading={loading} />
          {fileName && !loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Loaded: <span className="font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
              {data?.hasStrydData && (
                <span className="ml-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                  Stryd data detected
                </span>
              )}
            </p>
          )}
        </div>

        {/* Range Selector - shown when data is loaded */}
        {fullProcessedData && rangeSelection && !loading && (
          <RangeSelector
            totalTime={totalTime}
            totalDistance={totalDistance}
            selection={rangeSelection}
            onSelectionChange={handleRangeChange}
            onReset={handleResetRange}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="font-medium text-red-700 dark:text-red-400">Error</div>
            <p className="text-sm mt-1 text-red-600 dark:text-red-300">{error}</p>
            {debugInfo && (
              <details className="mt-3">
                <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer">Debug Information</summary>
                <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-x-auto text-red-800 dark:text-red-200">
{JSON.stringify({
  totalRecords: debugInfo.totalRecords,
  recordsWithSpeed: debugInfo.recordsWithSpeed,
  recordsWithGCT: debugInfo.recordsWithGCT,
  recordsWithHR: debugInfo.recordsWithHR,
  recordsWithCadence: debugInfo.recordsWithCadence,
  recordsWithPower: debugInfo.recordsWithPower,
  speedRange: debugInfo.speedRange,
  gctRange: debugInfo.gctRange,
  sampleRecordKeys: debugInfo.sampleRecord ? Object.keys(debugInfo.sampleRecord) : [],
}, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 mb-6 shadow-sm text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Processing FIT file...</p>
          </div>
        )}

        {/* Analysis Results */}
        {data && !loading && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mb-8">
              {activeTab === 'summary' && <SummaryTab data={data} />}
              {activeTab === 'charts' && <ChartsTab data={data} />}
              {activeTab === 'correlations' && <CorrelationsTab data={data} />}
              {activeTab === 'splits' && <SplitsTab data={data} />}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
          <p>Running Dynamics Analyzer</p>
          <p className="mt-1">Parses Garmin & Stryd FIT files with full running dynamics support</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
