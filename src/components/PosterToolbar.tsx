import React, { useRef, useState } from 'react';
import { Upload, RotateCcw, Download, SlidersHorizontal } from 'lucide-react';
import type { PosterMetadata } from '../types/experiment';

interface PosterToolbarProps {
  dataSourceLabel: string;
  isCustomData: boolean;
  totalRuns: number;
  datasetFilter: string;
  onChangeDatasetFilter: (filter: string) => void;
  onUploadCsv: (csvText: string, fileName: string) => void;
  onResetPilotData: () => void;
  uploadError: string | null;
  metadata: PosterMetadata;
  onUpdateMetadata: (next: PosterMetadata) => void;
}

export const PosterToolbar: React.FC<PosterToolbarProps> = ({
  dataSourceLabel,
  isCustomData,
  totalRuns,
  datasetFilter,
  onChangeDatasetFilter,
  onUploadCsv,
  onResetPilotData,
  uploadError,
  metadata,
  onUpdateMetadata,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMetaEditor, setShowMetaEditor] = useState(false);

  const filters = [
    { id: 'ALL', label: 'All Tasks' },
    { id: 'GSM8K', label: 'GSM8K' },
    { id: 'MATH-500', label: 'MATH-500' },
    { id: 'TriviaQA', label: 'TriviaQA' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCsv(reader.result, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section
      aria-label="Poster workspace controls"
      className="no-print bg-white border-b border-slate-200"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Data source status (clean unboxed text) */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">{dataSourceLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{totalRuns} logged inferences</span>
          {isCustomData && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onResetPilotData}
                className="inline-flex items-center gap-1 text-teal-700 font-medium hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restore Pilot Baseline</span>
              </button>
            </>
          )}
        </div>

        {/* Dataset filter segmented control + CSV upload + Poster metadata toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter poster charts by dataset"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
          >
            {filters.map((f) => {
              const active = datasetFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangeDatasetFilter(f.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload local CodeCarbon experiment CSV"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>Import Local CSV</span>
          </button>

          <a
            href="/kit/sample_results.csv"
            download="sample_results.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Sample CSV</span>
          </a>

          <button
            type="button"
            onClick={() => setShowMetaEditor((v) => !v)}
            aria-expanded={showMetaEditor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Edit Poster Info</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-3">
          <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            CSV Import Error: {uploadError}
          </p>
        </div>
      )}

      {showMetaEditor && (
        <div className="border-t border-slate-200 bg-slate-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="block text-xs font-medium text-slate-700">
              Poster Title
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => onUpdateMetadata({ ...metadata, title: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Authors / Student Group
              <input
                type="text"
                value={metadata.authors}
                onChange={(e) => onUpdateMetadata({ ...metadata, authors: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              University / Lab / Course
              <input
                type="text"
                value={metadata.affiliation}
                onChange={(e) => onUpdateMetadata({ ...metadata, affiliation: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Model Under Test
              <input
                type="text"
                value={metadata.modelLabel}
                onChange={(e) => onUpdateMetadata({ ...metadata, modelLabel: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Local Hardware & OS
              <input
                type="text"
                value={metadata.hardwareLabel}
                onChange={(e) => onUpdateMetadata({ ...metadata, hardwareLabel: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Event / Term
              <input
                type="text"
                value={metadata.courseContext}
                onChange={(e) => onUpdateMetadata({ ...metadata, courseContext: e.target.value })}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-2 focus:outline-teal-700"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
};
