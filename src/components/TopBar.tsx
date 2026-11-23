import { Camera } from 'lucide-react';
import { AppView } from '../types/study';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenSnapStudio: () => void;
  reviewCount: number;
  vocabUnmemorizedCount: number;
}

export function TopBar({
  activeView,
  onSelectView,
  onOpenSnapStudio,
  reviewCount,
  vocabUnmemorizedCount,
}: TopBarProps) {
  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'feed', label: '학습 피드' },
    { id: 'review', label: reviewCount > 0 ? `오답·복습함 (${reviewCount})` : '오답·복습함' },
    { id: 'vocab', label: vocabUnmemorizedCount > 0 ? `단어장 (${vocabUnmemorizedCount})` : '단어장' },
    { id: 'backup', label: '백업·관리' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('feed')}
          className="font-editorial text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 cursor-pointer"
        >
          PassageNote
        </button>

        {/* Zone 2: 4 single-line text nav links */}
        <nav
          aria-label="주요 메뉴"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="tabular-nums">{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSnapStudio}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.99] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>새 문제 찍기</span>
          </button>
        </div>
      </div>

      {/* Mobile compact secondary nav row (keeps total sticky height compact) */}
      <nav
        aria-label="모바일 메뉴"
        className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-1 overflow-x-auto"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 tabular-nums transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
