import { useState, useCallback } from 'react';
import { parseFITFile } from './lib/fit-parser';
import { processRecords, calculateMetrics } from './lib/data-processor';
import type { AnalysisResult } from './types/fit';
import { FileUpload } from './components/FileUpload';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const records = await parseFITFile(arrayBuffer);

      if (records.length === 0) {
        throw new Error('No running data found in FIT file');
      }

      const processed = processRecords(records);

      if (processed.length < 10) {
        throw new Error(
          `Not enough valid running data points found (${processed.length}). Ensure this is a running activity with valid running dynamics data.`
        );
      }

      const metrics = calculateMetrics(processed);

      if (!metrics) {
        throw new Error('Failed to calculate metrics from the running data');
      }

      setData(metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse FIT file');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">Running Dynamics Analyzer</h1>
          <p className="text-blue-100">
            Upload a FIT file to analyze your running form metrics from Garmin & Stryd
          </p>
        </header>

        {/* File Upload */}
        <div className="mb-6">
          <FileUpload onFileSelect={handleFileSelect} loading={loading} />
          {fileName && !loading && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Loaded: <span className="font-medium">{fileName}</span>
              {data?.hasStrydData && (
                <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Stryd data detected
                </span>
              )}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <div className="font-medium">Error</div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-white rounded-xl p-8 mb-6 shadow-sm text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Processing FIT file...</p>
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
                      : 'bg-white text-gray-600 hover:bg-gray-100'
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
        <footer className="text-center text-sm text-gray-400 py-8">
          <p>Running Dynamics Analyzer</p>
          <p className="mt-1">Parses Garmin & Stryd FIT files with full running dynamics support</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
