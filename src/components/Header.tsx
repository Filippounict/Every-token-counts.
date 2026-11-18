import React from 'react';
import { Printer } from 'lucide-react';

export type ActiveTab = 'poster' | 'method' | 'literature';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onExportPoster: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onExportPoster,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'poster', label: 'Scientific Poster' },
    { id: 'method', label: 'Method & Fast Run Kit' },
    { id: 'literature', label: 'Literature & Proof' },
  ];

  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('poster');
          }}
          className="font-display text-sm sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          TokenWatts Research
        </a>

        <nav aria-label="Primary workspace navigation" className="flex items-center gap-3 sm:gap-6 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  active
                    ? 'border-teal-700 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onExportPoster}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Export <span className="hidden sm:inline">A0 </span>PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
