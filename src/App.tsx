import { useMemo, useState } from 'react';
import { Header, type ActiveTab } from './components/Header';
import { PosterToolbar } from './components/PosterToolbar';
import { PosterView } from './components/PosterView';
import { MethodGuideView } from './components/MethodGuideView';
import { LiteratureStatsView } from './components/LiteratureStatsView';
import { buildPilotCalibrationRows } from './data/pilotBaselineData';
import { aggregateExperimentData, parseExperimentCsv } from './utils/statistics';
import type { ExperimentRow, PosterMetadata } from './types/experiment';

const DEFAULT_METADATA: PosterMetadata = {
  title: 'Every Token Counts: Energy, Output Limits, and Reasoning Trade-offs in Local LLM Inference',
  subtitle:
    'Empirical evaluation of input vs. output token scaling, accuracy saturation knees, and thinking mode cost-effectiveness using Ollama and CodeCarbon.',
  authors: 'Your Name / Research Group',
  affiliation: 'Information Systems Engineering · Local Green AI Lab',
  courseContext: 'Scientific Research Poster · 2026',
  hardwareLabel: 'Local Laptop (16 GB RAM, CPU / CodeCarbon Offline)',
  modelLabel: 'Qwen3-1.7B (Ollama Q4_K_M)',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('poster');
  const [datasetFilter, setDatasetFilter] = useState<string>('ALL');
  const [customRows, setCustomRows] = useState<ExperimentRow[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PosterMetadata>(DEFAULT_METADATA);

  const pilotRows = useMemo(() => buildPilotCalibrationRows(), []);
  const activeRows = customRows ?? pilotRows;

  const aggregated = useMemo(
    () => aggregateExperimentData(activeRows, datasetFilter, metadata.modelLabel),
    [activeRows, datasetFilter, metadata.modelLabel]
  );

  const handleUploadCsv = (csvText: string, fileName: string) => {
    try {
      const parsed = parseExperimentCsv(csvText);
      setCustomRows(parsed);
      setCustomFileName(fileName);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to parse CSV file.');
    }
  };

  const handleResetPilotData = () => {
    setCustomRows(null);
    setCustomFileName('');
    setUploadError(null);
  };

  const handleExportPoster = () => {
    if (activeTab !== 'poster') {
      setActiveTab('poster');
      setTimeout(() => window.print(), 80);
    } else {
      window.print();
    }
  };

  const dataSourceLabel = customRows
    ? `Source: ${customFileName}`
    : 'Source: Pilot Calibration Baseline (Literature-Grounded)';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportPoster={handleExportPoster}
      />

      {activeTab === 'poster' && (
        <PosterToolbar
          dataSourceLabel={dataSourceLabel}
          isCustomData={Boolean(customRows)}
          totalRuns={aggregated.totalRuns}
          datasetFilter={datasetFilter}
          onChangeDatasetFilter={setDatasetFilter}
          onUploadCsv={handleUploadCsv}
          onResetPilotData={handleResetPilotData}
          uploadError={uploadError}
          metadata={metadata}
          onUpdateMetadata={setMetadata}
        />
      )}

      <main className="flex-1">
        {activeTab === 'poster' && (
          <PosterView
            data={aggregated}
            metadata={metadata}
            isCustomData={Boolean(customRows)}
            datasetFilter={datasetFilter}
          />
        )}
        {activeTab === 'method' && <MethodGuideView />}
        {activeTab === 'literature' && <LiteratureStatsView />}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>Every Token Counts · Local LLM Energy & Accuracy Study (Ollama + CodeCarbon)</span>
          <span>Grounded in Samsi et al. (2023), Zadenoori et al. (2025), UNESCO & UCL (2025), Fernandez et al. (2025)</span>
        </div>
      </footer>
    </div>
  );
}
