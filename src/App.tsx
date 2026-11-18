import { useMemo, useState } from 'react';
import { Header, type ActiveTab } from './components/Header';
import { PosterToolbar } from './components/PosterToolbar';
import { PosterView } from './components/PosterView';
import { MethodGuideView } from './components/MethodGuideView';
import { LiteratureStatsView } from './components/LiteratureStatsView';
import { buildPilotCalibrationRows } from './data/pilotBaselineData';
import { aggregateExperimentData, parseExperimentCsv } from './utils/statistics';
import { exportPosterToA0Pptx } from './utils/exportA0Pptx';
import type { ExperimentRow, PosterMetadata, ProofOfWorkManifest } from './types/experiment';

const DEFAULT_METADATA: PosterMetadata = {
  title: 'Every Token Counts: Input Length, Output Length, and Reasoning Mode on Local LLM Energy & Quality',
  subtitle:
    'Measured locally with Ollama (qwen3:1.7b) and CodeCarbon — comparing input vs. output energy, output length sweet spots, long-input quality loss, and reasoning (“thinking”) mode trade-offs with full Proof-of-Work logs.',
  authors: 'Your Name / Student Group',
  affiliation: 'Information Systems Engineering · Local Green AI Lab',
  courseContext: 'SusCo 2026 · Scientific Poster',
  hardwareLabel: 'Local Laptop (16 GB RAM, AC Power / CodeCarbon Machine Mode)',
  modelLabel: 'qwen3:1.7b (Ollama · Direct vs. Thinking)',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('poster');
  const [datasetFilter, setDatasetFilter] = useState<string>('ALL');
  const [customRows, setCustomRows] = useState<ExperimentRow[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [proofManifest, setProofManifest] = useState<ProofOfWorkManifest | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<PosterMetadata>(DEFAULT_METADATA);

  const previewRows = useMemo(() => buildPilotCalibrationRows(), []);
  const activeRows = customRows ?? previewRows;

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

  const handleUploadProofJson = (jsonText: string, _fileName: string) => {
    try {
      const parsed = JSON.parse(jsonText) as ProofOfWorkManifest;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid proof_of_work.json object.');
      }
      setProofManifest(parsed);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to parse proof_of_work.json.');
    }
  };

  const handleResetPilotData = () => {
    setCustomRows(null);
    setCustomFileName('');
    setProofManifest(null);
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

  const handleDownloadA0Pptx = async () => {
    if (isExportingPptx) return;
    setIsExportingPptx(true);
    setUploadError(null);
    try {
      await exportPosterToA0Pptx({
        data: aggregated,
        metadata,
        isCustomData: Boolean(customRows),
        datasetFilter,
        proofManifest,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? `PowerPoint export failed: ${err.message}` : 'Unable to generate A0 PowerPoint file.'
      );
    } finally {
      setIsExportingPptx(false);
    }
  };

  const dataSourceLabel = customRows
    ? `Source: ${customFileName}`
    : 'Source: Example Preliminary Preview';

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
          onUploadProofJson={handleUploadProofJson}
          proofManifest={proofManifest}
          onResetPilotData={handleResetPilotData}
          onDownloadA0Pptx={handleDownloadA0Pptx}
          isExportingPptx={isExportingPptx}
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
            proofManifest={proofManifest}
          />
        )}
        {activeTab === 'method' && <MethodGuideView />}
        {activeTab === 'literature' && (
          <LiteratureStatsView
            data={aggregated}
            isCustomData={Boolean(customRows)}
            proofManifest={proofManifest}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>Every Token Counts · Local LLM Energy &amp; Quality Study (Ollama + CodeCarbon)</span>
          <span>Grounded in UNESCO &amp; UCL (2025), Fernandez et al. (2025), Levy et al. (2024), Liu et al. (2024), Samsi et al. (2023), Zadenoori et al. (2025)</span>
        </div>
      </footer>
    </div>
  );
}
