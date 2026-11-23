import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { StudyPost } from '../types/study';
import { estimatePostsSizeBytes } from '../lib/storage';

interface BackupViewProps {
  posts: StudyPost[];
  onImportPosts: (imported: StudyPost[]) => Promise<number>;
  onRestoreSamples: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupView({
  posts,
  onImportPosts,
  onRestoreSamples,
  onClearAll,
}: BackupViewProps) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const problemCount = posts.filter((p) => p.postType === 'problem').length;
  const writingCount = posts.filter((p) => p.postType === 'writing').length;
  const passageCount = posts.filter((p) => p.postType === 'passage').length;
  const masteredCount = posts.filter((p) => p.studyStatus === 'mastered').length;
  const vocabCount = posts.reduce((acc, p) => acc + p.analysis.vocabulary.length, 0);
  const estimatedSize = estimatePostsSizeBytes(posts);

  const handleExport = () => {
    const payload = {
      app: 'PassageNote',
      version: 2,
      exportedAt: new Date().toISOString(),
      posts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `passagenote-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({
      type: 'success',
      text: `학습 노트 ${posts.length}건을 JSON 백업 파일로 내보냈습니다.`,
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const list: unknown = Array.isArray(parsed) ? parsed : parsed?.posts;
      if (!Array.isArray(list)) {
        throw new Error('올바른 PassageNote 백업 파일 형식이 아닙니다.');
      }
      const valid = list.filter(
        (item): item is StudyPost =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as StudyPost).id === 'string' &&
          typeof (item as StudyPost).title === 'string' &&
          Boolean((item as StudyPost).analysis)
      );
      if (valid.length === 0) {
        throw new Error('가져올 수 있는 유효한 학습 노트가 파일에 없습니다.');
      }
      const addedCount = await onImportPosts(valid);
      setNotice({
        type: 'success',
        text: `총 ${addedCount}건의 학습 노트를 브라우저 저장소에 병합했습니다.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : '백업 파일을 읽는 데 실패했습니다.',
      });
    }
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-medium text-slate-500">로그인 없는 로컬 아카이브</p>
          <h1 className="mt-1 font-editorial text-2xl sm:text-3xl font-bold text-slate-900">
            저장소 현황 및 백업 관리
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            모든 사진, 문제 풀이, 영작 AI 첨삭 이력은 현재 브라우저(IndexedDB)에만 저장됩니다. 기기 변경 전에 JSON 파일로 백업할 수 있습니다.
          </p>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">저장된 노트</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {posts.length}건
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              문제 {problemCount} · 영작 {writingCount} · 원문 {passageCount}
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">이해 완료</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 font-mono-tabular">
              {masteredCount}건
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              복습 필요 {posts.length - masteredCount}건
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">누적 핵심 어휘</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {vocabCount}개
            </p>
            <p className="mt-1 text-xs text-slate-500">단어장에서 복습 가능</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">로컬 데이터 크기</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {formatBytes(estimatedSize)}
            </p>
            <p className="mt-1 text-xs text-slate-500">IndexedDB 보관 중</p>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Backup / Restore Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-5 border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">백업 파일로 내보내기</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              저장된 사진, 객관식 풀이, 영작 첨삭 기록, 내 오답 메모까지 하나의 JSON 파일로 다운로드합니다.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={posts.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>JSON 백업 다운로드</span>
            </button>
          </div>

          <div className="p-5 border border-slate-200 rounded-xl space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">백업 파일 불러오기</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              이전에 저장해 둔 PassageNote JSON 파일을 선택하면 기존 노트와 합쳐서 복원합니다.
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>JSON 파일 선택하기</span>
            </button>
          </div>
        </div>

        {/* Sample Restore & Clear */}
        <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={async () => {
              await onRestoreSamples();
              setNotice({
                type: 'success',
                text: '영어 문제 · 한·영 혼합 서술형 · 한국어 영작 예시 노트 3건을 다시 추가했습니다.',
              });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>예시 노트 3종 다시 불러오기</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={posts.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>전체 학습 기록 비우기</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-red-800">
                모든 노트를 삭제할까요? (복구 불가)
              </span>
              <button
                type="button"
                onClick={async () => {
                  await onClearAll();
                  setConfirmClear(false);
                  setNotice({ type: 'success', text: '모든 로컬 학습 기록을 비웠습니다.' });
                }}
                className="text-xs font-bold text-red-700 hover:underline cursor-pointer"
              >
                삭제 확인
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-xs text-slate-600 hover:underline cursor-pointer"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
