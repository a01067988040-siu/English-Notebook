import { BookmarkCheck, RotateCcw, Search, X } from 'lucide-react';
import { LanguageFormat, PostType, StudyPost } from '../types/study';

interface FeedSidebarProps {
  posts: StudyPost[];
  selectedId: string | null;
  onSelectPost: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: 'all' | PostType;
  onTypeFilterChange: (t: 'all' | PostType) => void;
  onlyReviewMode: boolean;
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}`;
}

function getLanguageLabel(fmt: LanguageFormat | undefined): string {
  if (fmt === 'korean') return '한국어';
  if (fmt === 'mixed') return '한·영 혼합';
  return '영어';
}

export function FeedSidebar({
  posts,
  selectedId,
  onSelectPost,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onlyReviewMode,
}: FeedSidebarProps) {
  return (
    <aside className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {onlyReviewMode ? '오답·복습 필요 노트' : '내 학습 피드'}
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">총 {posts.length}건</span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="제목, 출처, 한글·영문 검색"
            aria-label="학습 노트 검색"
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Interactive 4-segment filter tabs */}
        <div
          className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg"
          role="group"
          aria-label="자료 유형 필터"
        >
          {[
            { id: 'all' as const, label: '전체' },
            { id: 'problem' as const, label: '문제' },
            { id: 'writing' as const, label: '영작' },
            { id: 'passage' as const, label: '원문' },
          ].map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTypeFilterChange(tab.id)}
                className={`py-1.5 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List items */}
      <div className="divide-y divide-slate-100 max-h-[420px] lg:max-h-[calc(100vh-250px)] overflow-y-auto">
        {posts.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">조건에 맞는 학습 노트가 없습니다</p>
            <p className="mt-1 text-xs text-slate-500">
              {onlyReviewMode
                ? '모든 노트를 이해 완료 상태로 체크하셨습니다.'
                : '상단의 "새 문제 찍기" 버튼으로 영어·한국어 문제를 게시해 보세요.'}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isSelected = post.id === selectedId;
            const langLabel = getLanguageLabel(post.languageFormat);
            const subLabel =
              post.postType === 'writing'
                ? post.analysis.writingSection?.writingType || '영작 서술형'
                : post.postType === 'problem'
                  ? post.analysis.problemSection?.questionType || '객관식 풀이'
                  : '원문 독해';

            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onSelectPost(post.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 ${
                  isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">
                    {langLabel} · {subLabel}
                  </span>
                  <span className="font-mono-tabular shrink-0">{formatDateShort(post.createdAt)}</span>
                </div>

                <p
                  className={`mt-1 text-sm font-semibold leading-snug line-clamp-2 ${
                    isSelected ? 'text-blue-900' : 'text-slate-900'
                  }`}
                >
                  {post.title}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  {post.studyStatus === 'mastered' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>이해 완료</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>복습 필요</span>
                    </span>
                  )}

                  <span className="text-slate-400 truncate max-w-[150px]">
                    {post.imageDataUrls && post.imageDataUrls.length > 1
                      ? `${post.sourceTag ? `${post.sourceTag} · ` : ''}사진 ${post.imageDataUrls.length}장`
                      : post.sourceTag || `어휘 ${post.analysis.vocabulary.length}`}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
