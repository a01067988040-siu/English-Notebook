import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Eye, EyeOff, Search, X } from 'lucide-react';
import { StudyPost, VocabItem } from '../types/study';

interface VocabVaultViewProps {
  posts: StudyPost[];
  onToggleVocabMemorized: (postId: string, vocabId: string) => Promise<void>;
  onOpenPost: (postId: string) => void;
}

interface FlattenedVocab extends VocabItem {
  postId: string;
  postTitle: string;
  sourceTag: string;
}

export function VocabVaultView({
  posts,
  onToggleVocabMemorized,
  onOpenPost,
}: VocabVaultViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unmemorized' | 'memorized'>('all');
  const [hideMeanings, setHideMeanings] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const allVocab = useMemo<FlattenedVocab[]>(() => {
    const items: FlattenedVocab[] = [];
    for (const post of posts) {
      for (const v of post.analysis.vocabulary) {
        items.push({
          ...v,
          postId: post.id,
          postTitle: post.title,
          sourceTag: post.sourceTag,
        });
      }
    }
    return items;
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVocab.filter((item) => {
      if (filter === 'unmemorized' && item.memorized) return false;
      if (filter === 'memorized' && !item.memorized) return false;
      if (!q) return true;
      return (
        item.word.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.postTitle.toLowerCase().includes(q)
      );
    });
  }, [allVocab, filter, search]);

  const memorizedTotal = allVocab.filter((v) => v.memorized).length;

  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-medium text-slate-500">전체 게시물 통합 어휘장</p>
            <h1 className="mt-1 font-editorial text-2xl sm:text-3xl font-bold text-slate-900">
              내 지문 핵심 단어장
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              찍어서 게시한 모든 지문에서 추출된 수능·내신 핵심 어휘를 한곳에서 복습하세요.
            </p>
          </div>
          <div className="text-right tabular-nums">
            <p className="text-xs text-slate-500">전체 암기 현황</p>
            <p className="text-xl font-bold text-slate-900 font-mono-tabular">
              {memorizedTotal} / {allVocab.length}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="단어, 뜻, 지문 제목 검색"
                aria-label="단어장 검색"
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="검색어 지우기"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'all' as const, label: '전체' },
                { id: 'unmemorized' as const, label: '미암기' },
                { id: 'memorized' as const, label: '암기 완료' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filter === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setHideMeanings((v) => !v);
              setRevealedKeys({});
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              hideMeanings
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {hideMeanings ? (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>전체 뜻 보기</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>뜻 가리기 테스트</span>
              </>
            )}
          </button>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-medium text-slate-700">표시할 단어가 없습니다</p>
            <p className="mt-1 text-xs text-slate-500">
              다른 필터를 선택하거나 새 영어 지문을 게시해 단어를 모아보세요.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {filtered.map((item) => {
              const key = `${item.postId}:${item.id}`;
              const hidden = hideMeanings && !revealedKeys[key];
              return (
                <div
                  key={key}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.memorized ? 'bg-slate-50/70' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="font-editorial text-lg font-bold text-slate-900">
                        {item.word}
                      </span>
                      <span className="font-mono-tabular text-xs text-slate-500">
                        {item.partOfSpeech}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPost(item.postId)}
                        className="inline-flex items-center gap-0.5 text-xs text-blue-700 hover:underline cursor-pointer"
                      >
                        <span className="truncate max-w-[240px]">
                          {item.sourceTag || item.postTitle}
                        </span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </button>
                    </div>

                    <div>
                      {hidden ? (
                        <button
                          type="button"
                          onClick={() => setRevealedKeys((prev) => ({ ...prev, [key]: true }))}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          뜻 확인하기
                        </button>
                      ) : (
                        <p className="text-[15px] font-medium text-slate-800">{item.meaning}</p>
                      )}
                    </div>

                    {(item.synonyms.length > 0 || item.antonyms.length > 0) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {item.synonyms.length > 0 && (
                          <span>유의어: {item.synonyms.join(', ')}</span>
                        )}
                        {item.antonyms.length > 0 && (
                          <span>반의어: {item.antonyms.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleVocabMemorized(item.postId, item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border shrink-0 self-start sm:self-center transition-colors cursor-pointer ${
                      item.memorized
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.memorized ? '암기 완료' : '암기 체크'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
