import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  PenTool,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AnalysisModeRequest,
  AnalysisResult,
  LanguageFormat,
  SimilarFocusMode,
  SimilarSearchResult,
  SolveStylePreference,
  StudyPost,
  StudyStatus,
  StudyTab,
  WritingAttempt,
} from '../types/study';

interface StudyWorkspaceProps {
  post: StudyPost;
  onUpdatePost: (updated: StudyPost) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onOpenSnapStudio: () => void;
  onOpenTutor?: () => void;
}

type LeftPaneMode = 'photo' | 'text';
type LiteralViewMode = 'chunked' | 'natural' | 'parallel';

function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function getLanguageLabel(fmt: LanguageFormat | undefined): string {
  if (fmt === 'korean') return '한국어 문제';
  if (fmt === 'mixed') return '한·영 혼합 문제';
  return '영어 문제·원문';
}

function countWords(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function parseApiJson<T>(res: Response, fallbackMsg: string): Promise<T> {
  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`서버 응답을 처리하지 못했습니다 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`);
  }
  if (!res.ok) {
    throw new Error(
      typeof parsed.error === 'string' && parsed.error
        ? parsed.error
        : `${fallbackMsg} (HTTP ${res.status})`
    );
  }
  return parsed as unknown as T;
}

export function StudyWorkspace({
  post,
  onUpdatePost,
  onDeletePost,
  onOpenSnapStudio,
  onOpenTutor,
}: StudyWorkspaceProps) {
  const hasProblem = Boolean(post.analysis.problemSection);
  const hasWriting = Boolean(post.analysis.writingSection);

  const getDefaultTab = (): StudyTab => {
    if (post.postType === 'writing' && hasWriting) return 'writing_guide';
    if (hasProblem) return 'answer';
    if (hasWriting) return 'writing_guide';
    return 'literal';
  };

  const postImages =
    post.imageDataUrls && post.imageDataUrls.length > 0
      ? post.imageDataUrls
      : post.imageDataUrl
        ? [post.imageDataUrl]
        : [];

  const [leftMode, setLeftMode] = useState<LeftPaneMode>(postImages.length > 0 ? 'photo' : 'text');
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<StudyTab>(getDefaultTab);
  const [zoom, setZoom] = useState<number>(1);

  // Interactive Problem Solving state
  const [choiceDraft, setChoiceDraft] = useState<string | null>(post.userSelectedChoice || null);
  const [revealProblemSolution, setRevealProblemSolution] = useState<boolean>(
    Boolean(post.userSelectedChoice)
  );

  // Writing Buildup & AI Grading state
  const [hideWritingModel, setHideWritingModel] = useState<boolean>(false);
  const [writingDraft, setWritingDraft] = useState<string>('');
  const [gradingWriting, setGradingWriting] = useState<boolean>(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // Shared Reading / Study states
  const [highlightEvidence, setHighlightEvidence] = useState<boolean>(true);
  const [focusedSentence, setFocusedSentence] = useState<number | null>(null);
  const [literalMode, setLiteralMode] = useState<LiteralViewMode>('parallel');
  const [hideVocabMeanings, setHideVocabMeanings] = useState<boolean>(false);
  const [revealedVocabIds, setRevealedVocabIds] = useState<Record<string, boolean>>({});

  // Inline text editing & re-analysis
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(post.analysis.extractedText);
  const [reanalyzing, setReanalyzing] = useState<boolean>(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  // Memo editing
  const [memoDraft, setMemoDraft] = useState<string>(post.userMemo);
  const [memoSavedNotice, setMemoSavedNotice] = useState<boolean>(false);

  // Follow-up Q&A
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [followUpSolveStyle, setFollowUpSolveStyle] = useState<SolveStylePreference>(
    post.solvePreference || 'balanced'
  );
  const [askingFollowUp, setAskingFollowUp] = useState<boolean>(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Similar problem internet search
  const [similarFocusMode, setSimilarFocusMode] = useState<SimilarFocusMode>(
    post.similarSearch?.focusMode || (hasWriting ? 'grammar_writing' : 'csat_variant')
  );
  const [similarCustomQuery, setSimilarCustomQuery] = useState<string>('');
  const [searchingSimilar, setSearchingSimilar] = useState<boolean>(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    const imgs =
      post.imageDataUrls && post.imageDataUrls.length > 0
        ? post.imageDataUrls
        : post.imageDataUrl
          ? [post.imageDataUrl]
          : [];
    setLeftMode(imgs.length > 0 ? 'photo' : 'text');
    setActiveImageIdx(0);
    setActiveTab(getDefaultTab());
    setZoom(1);
    setChoiceDraft(post.userSelectedChoice || null);
    setRevealProblemSolution(Boolean(post.userSelectedChoice));
    setWritingDraft('');
    setGradingError(null);
    setFocusedSentence(null);
    setIsEditingText(false);
    setEditedText(post.analysis.extractedText);
    setReanalyzeError(null);
    setMemoDraft(post.userMemo);
    setMemoSavedNotice(false);
    setFollowUpSolveStyle(post.solvePreference || 'balanced');
    setFollowUpError(null);
    setSimilarFocusMode(
      post.similarSearch?.focusMode || (hasWriting ? 'grammar_writing' : 'csat_variant')
    );
    setSimilarCustomQuery('');
    setSimilarError(null);
    setConfirmingDelete(false);
    setRevealedVocabIds({});
  }, [post.id]);

  // Debounced auto-save for personal memo
  useEffect(() => {
    if (memoDraft === post.userMemo) return;
    const timer = window.setTimeout(async () => {
      await onUpdatePost({
        ...post,
        userMemo: memoDraft,
        updatedAt: Date.now(),
      });
      setMemoSavedNotice(true);
      window.setTimeout(() => setMemoSavedNotice(false), 1800);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [memoDraft, post, onUpdatePost]);

  const handleToggleStatus = async () => {
    const nextStatus: StudyStatus =
      post.studyStatus === 'mastered' ? 'review_needed' : 'mastered';
    await onUpdatePost({
      ...post,
      studyStatus: nextStatus,
      updatedAt: Date.now(),
    });
  };

  const handleSubmitChoice = async () => {
    if (!choiceDraft) return;
    setRevealProblemSolution(true);
    await onUpdatePost({
      ...post,
      userSelectedChoice: choiceDraft,
      updatedAt: Date.now(),
    });
  };

  const handleResetChoiceAttempt = async () => {
    setChoiceDraft(null);
    setRevealProblemSolution(false);
    await onUpdatePost({
      ...post,
      userSelectedChoice: null,
      updatedAt: Date.now(),
    });
  };

  const handleGradeWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = writingDraft.trim();
    if (!trimmed || gradingWriting || !post.analysis.writingSection) return;

    setGradingWriting(true);
    setGradingError(null);
    try {
      const ws = post.analysis.writingSection;
      const res = await fetch('/api/grade-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: post.analysis.extractedText,
          koreanPrompt: ws.koreanPrompt || post.analysis.koreanInstruction,
          contextTemplate: ws.contextTemplate,
          givenWords: ws.givenWords.length > 0 ? ws.givenWords : post.analysis.givenWords,
          conditions: ws.conditions.length > 0 ? ws.conditions : post.analysis.conditions,
          modelAnswer: ws.modelAnswer,
          userAnswer: trimmed,
        }),
      });
      const data = await parseApiJson<{
        verdict: WritingAttempt['verdict'];
        scoreLabel: string;
        conditionChecks: WritingAttempt['conditionChecks'];
        correctedSentence: string;
        feedbackKorean: string;
      }>(res, '영작 첨삭 요청에 실패했습니다.');

      const attempt: WritingAttempt = {
        id: `wa-${Date.now()}`,
        createdAt: Date.now(),
        userAnswer: trimmed,
        verdict: data.verdict,
        scoreLabel: data.scoreLabel,
        conditionChecks: data.conditionChecks || [],
        correctedSentence: data.correctedSentence || ws.modelAnswer,
        feedbackKorean: data.feedbackKorean || '',
      };

      const nextAttempts = [attempt, ...(post.writingAttempts || [])];
      await onUpdatePost({
        ...post,
        writingAttempts: nextAttempts,
        updatedAt: Date.now(),
      });
      setWritingDraft('');
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : '첨삭 처리 중 오류가 발생했습니다.');
    } finally {
      setGradingWriting(false);
    }
  };

  const handleToggleVocabMemorized = async (vocabId: string) => {
    const updatedVocab = post.analysis.vocabulary.map((v) =>
      v.id === vocabId ? { ...v, memorized: !v.memorized } : v
    );
    await onUpdatePost({
      ...post,
      analysis: {
        ...post.analysis,
        vocabulary: updatedVocab,
      },
      updatedAt: Date.now(),
    });
  };

  const handleReanalyzeText = async () => {
    if (!editedText.trim()) return;
    setReanalyzing(true);
    setReanalyzeError(null);
    try {
      const requestedType: AnalysisModeRequest = post.postType;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textOverride: editedText.trim(),
          requestedType,
          sourceTag: post.sourceTag,
          solvePreference: followUpSolveStyle,
          solveRequestNote: post.solveRequestNote || '',
        }),
      });
      const nextAnalysis = await parseApiJson<AnalysisResult>(res, '재분석 요청에 실패했습니다.');
      await onUpdatePost({
        ...post,
        title: nextAnalysis.title || post.title,
        languageFormat: nextAnalysis.languageFormat || post.languageFormat,
        postType: nextAnalysis.detectedPostType,
        solvePreference: followUpSolveStyle,
        analysis: nextAnalysis,
        updatedAt: Date.now(),
      });
      setIsEditingText(false);
    } catch (err) {
      setReanalyzeError(err instanceof Error ? err.message : '재분석 중 오류가 발생했습니다.');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleAskFollowUp = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || askingFollowUp) return;

    setAskingFollowUp(true);
    setFollowUpError(null);
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: post.analysis.extractedText,
          summaryKorean: post.analysis.summaryKorean,
          modelAnswer: post.analysis.writingSection?.modelAnswer || undefined,
          solvePreference: followUpSolveStyle,
          question: q,
          history: post.followUpHistory.map((h) => ({ question: h.question, answer: h.answer })),
        }),
      });
      const data = await parseApiJson<{ answer: string }>(res, '답변 생성에 실패했습니다.');

      const newItem = {
        id: `fq-${Date.now()}`,
        question: q,
        answer: data.answer as string,
        createdAt: Date.now(),
      };

      await onUpdatePost({
        ...post,
        followUpHistory: [...post.followUpHistory, newItem],
        updatedAt: Date.now(),
      });
      setFollowUpInput('');
    } catch (err) {
      setFollowUpError(err instanceof Error ? err.message : '질문 처리 중 오류가 발생했습니다.');
    } finally {
      setAskingFollowUp(false);
    }
  };

  const handleFindSimilar = async (overrideMode?: SimilarFocusMode) => {
    if (searchingSimilar) return;
    const modeToUse = overrideMode || similarFocusMode;
    setSearchingSimilar(true);
    setSimilarError(null);
    try {
      const grammarTitles = Array.from(
        new Set(
          post.analysis.sentences.flatMap((s) => s.grammarPoints.map((g) => g.pointTitle))
        )
      ).filter(Boolean);

      const res = await fetch('/api/find-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          extractedText: post.analysis.extractedText,
          koreanInstruction: post.analysis.koreanInstruction,
          languageFormat: post.languageFormat,
          postType: post.postType,
          questionType:
            post.analysis.problemSection?.questionType ||
            post.analysis.writingSection?.writingType ||
            '',
          grammarPoints: grammarTitles,
          focusMode: modeToUse,
          customQuery: similarCustomQuery.trim(),
        }),
      });
      const result = await parseApiJson<SimilarSearchResult>(
        res,
        '인터넷 유사 문제 검색에 실패했습니다.'
      );
      await onUpdatePost({
        ...post,
        similarSearch: result,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setSimilarError(
        err instanceof Error ? err.message : '유사 문제 검색 중 오류가 발생했습니다.'
      );
    } finally {
      setSearchingSimilar(false);
    }
  };

  const jumpToEvidenceSentence = (sentenceIdx: number) => {
    setLeftMode('text');
    setHighlightEvidence(true);
    setFocusedSentence(sentenceIdx);
  };

  const evidenceSet = new Set([
    ...(post.analysis.problemSection?.evidenceSentences || []),
    ...(post.analysis.writingSection?.evidenceSentences || []),
  ]);
  const memorizedCount = post.analysis.vocabulary.filter((v) => v.memorized).length;
  const writingAttempts = post.writingAttempts || [];
  const similarResult = post.similarSearch || null;
  const similarBadgeCount = similarResult
    ? similarResult.items.length || similarResult.webSources.length
    : 0;

  const studyTabs: Array<{ id: StudyTab; label: string; show: boolean }> = [
    { id: 'answer', label: '문제 풀기·해설', show: hasProblem },
    { id: 'writing_guide', label: '영작 빌드업·모범답안', show: hasWriting },
    {
      id: 'writing_grade',
      label: writingAttempts.length > 0 ? `내 영작 AI 첨삭 (${writingAttempts.length})` : '내 영작 AI 첨삭',
      show: hasWriting,
    },
    { id: 'literal', label: '직독직해·해석', show: post.analysis.sentences.length > 0 },
    { id: 'grammar', label: '문장·구문 분석', show: post.analysis.sentences.length > 0 },
    { id: 'vocab', label: `핵심 어휘 (${post.analysis.vocabulary.length})`, show: true },
    {
      id: 'similar',
      label: similarBadgeCount > 0 ? `유사 문제 검색 (${similarBadgeCount})` : '유사 문제 검색',
      show: true,
    },
  ];

  const subTypeLabel = hasWriting
    ? post.analysis.writingSection?.writingType || '서술형 영작'
    : hasProblem
      ? post.analysis.problemSection?.questionType || '객관식 풀이'
      : '원문 정밀 독해';

  const koreanInstruction = post.analysis.koreanInstruction;
  const givenWords =
    post.analysis.givenWords.length > 0
      ? post.analysis.givenWords
      : post.analysis.writingSection?.givenWords || [];
  const conditions =
    post.analysis.conditions.length > 0
      ? post.analysis.conditions
      : post.analysis.writingSection?.conditions || [];

  const userIsCorrectOnChoice =
    hasProblem &&
    post.userSelectedChoice &&
    post.analysis.problemSection &&
    post.userSelectedChoice === post.analysis.problemSection.correctAnswer;

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Editorial Article Header */}
      <header className="px-5 sm:px-8 pt-6 pb-5 border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {getLanguageLabel(post.languageFormat)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{subTypeLabel}</span>
            {post.sourceTag && (
              <>
                <span aria-hidden="true">·</span>
                <span>{post.sourceTag}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{formatFullDate(post.createdAt)}</span>
            {post.isSample && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">예시 노트</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                post.studyStatus === 'mastered'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {post.studyStatus === 'mastered' ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>이해 완료</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>복습 필요</span>
                </>
              )}
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label="학습 노트 삭제"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>삭제</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
                <span className="text-xs font-medium text-red-800 whitespace-nowrap">삭제할까요?</span>
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  className="text-xs font-semibold text-red-700 hover:underline px-1 cursor-pointer"
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-slate-600 hover:underline px-1 cursor-pointer"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        <h1 className="mt-2.5 font-editorial text-2xl sm:text-[28px] font-bold text-slate-900 leading-snug text-balance">
          {post.title}
        </h1>
        {post.analysis.summaryKorean && (
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-3xl">
            {post.analysis.summaryKorean}
          </p>
        )}
      </header>

      {/* 2-Zone Split Stage */}
      <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch">
        {/* Left Zone (45% / 5 cols): Source Photo <-> Structured Problem & Passage */}
        <section
          aria-label="원본 이미지 및 문제 원문 구조"
          className="xl:col-span-5 border-b xl:border-b-0 xl:border-r border-slate-200 bg-slate-50/60 flex flex-col"
        >
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLeftMode('photo')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  leftMode === 'photo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {postImages.length > 1 ? `원본 사진 (${postImages.length})` : '원본 사진'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLeftMode('text')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  leftMode === 'text'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>문제·원문 보기</span>
              </button>
            </div>

            {leftMode === 'photo' && postImages.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
                  aria-label="사진 축소"
                  disabled={zoom <= 1}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600 font-mono-tabular w-11 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.25, Number((z + 0.25).toFixed(2))))}
                  aria-label="사진 확대"
                  disabled={zoom >= 2.25}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}

            {leftMode === 'text' && (
              <div className="flex items-center gap-2">
                {evidenceSet.size > 0 && !isEditingText && (
                  <button
                    type="button"
                    onClick={() => setHighlightEvidence((v) => !v)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      highlightEvidence
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    단서 강조 {highlightEvidence ? '켜짐' : '꺼짐'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingText((v) => !v);
                    setEditedText(post.analysis.extractedText);
                    setReanalyzeError(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEditingText ? '편집 닫기' : '원문 수정'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-5 flex-1 overflow-auto max-h-[680px]">
            {leftMode === 'photo' ? (
              postImages.length > 0 ? (
                <div className="space-y-3">
                  {postImages.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                      {postImages.map((imgUrl, idx) => {
                        const isCur = idx === activeImageIdx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIdx(idx)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                              isCur
                                ? 'bg-blue-50 border-blue-600 text-blue-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`원본 사진 썸네일 ${idx + 1}`}
                              className="w-5 h-5 rounded object-cover"
                            />
                            <span className="font-mono-tabular">사진 {idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                    <div
                      style={{ width: `${zoom * 100}%` }}
                      className="transition-[width] duration-150 origin-top-left"
                    >
                      <img
                        src={postImages[activeImageIdx] || postImages[0]}
                        alt={`${post.title} 원본 사진 ${activeImageIdx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-auto rounded object-contain block"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center p-6 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium text-slate-700">텍스트 직접 입력으로 등록된 노트입니다</p>
                  <p className="mt-1 text-xs text-slate-500">
                    상단의 "문제·원문 보기" 탭에서 추출된 문제와 조건을 확인하거나 수정할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLeftMode('text')}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    문제·원문 보기로 전환
                  </button>
                </div>
              )
            ) : isEditingText ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  사진 인식 결과에 오타가 있거나 한국어 &lt;조건&gt;·영어 지문을 수정하고 싶다면 아래에서 편집 후 재분석하세요.
                </p>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={14}
                  className="w-full p-3.5 text-sm font-editorial leading-relaxed bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-700"
                />
                {reanalyzeError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {reanalyzeError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingText(false)}
                    disabled={reanalyzing}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleReanalyzeText}
                    disabled={reanalyzing || !editedText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    {reanalyzing && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    <span>{reanalyzing ? '재분석 중...' : '수정한 내용으로 재분석'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Structured Korean Instruction / Given Words / Conditions (for Korean & Hybrid problems) */}
                {(koreanInstruction || givenWords.length > 0 || conditions.length > 0) && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    {koreanInstruction && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">출제 발문·우리말 제시문</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 leading-relaxed">
                          {koreanInstruction}
                        </p>
                      </div>
                    )}

                    {post.analysis.writingSection?.contextTemplate && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-500">빈칸 영작 문맥 틀</p>
                        <p className="mt-1 font-editorial text-sm text-blue-900 bg-blue-50/70 border border-blue-100 rounded px-3 py-2">
                          {post.analysis.writingSection.contextTemplate}
                        </p>
                      </div>
                    )}

                    {givenWords.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-500">&lt;보기&gt; 제시 단어</p>
                        <p className="mt-1 font-editorial text-sm text-slate-800">
                          {givenWords.join('  /  ')}
                        </p>
                      </div>
                    )}

                    {conditions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-500">&lt;조건&gt;</p>
                        <ol className="mt-1 space-y-1 text-xs text-slate-700 list-decimal list-inside">
                          {conditions.map((cond, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {cond}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Sentence-numbered English passage (when present) */}
                {post.analysis.sentences.length > 0 && post.languageFormat !== 'korean' && (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100">
                      <span>영어 지문 문장별 보기</span>
                      <span className="font-mono-tabular">{post.analysis.sentences.length}문장</span>
                    </div>
                    <div className="font-editorial text-[16px] leading-[1.75] text-slate-900 space-y-2.5">
                      {post.analysis.sentences.map((s) => {
                        const isEvidence = highlightEvidence && evidenceSet.has(s.index);
                        const isFocused = focusedSentence === s.index;
                        return (
                          <p
                            key={s.index}
                            onClick={() => setFocusedSentence(s.index)}
                            className={`rounded px-2 py-1 -mx-2 transition-colors cursor-pointer ${
                              isFocused
                                ? 'bg-blue-100/80 text-slate-950'
                                : isEvidence
                                  ? 'bg-amber-100/70 text-slate-950'
                                  : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-mono-tabular text-[11px] font-semibold text-slate-400 mr-2 select-none">
                              {String(s.index).padStart(2, '0')}
                            </span>
                            <span>{s.original}</span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Raw extracted block */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">인식된 전체 원문</p>
                  <pre className="whitespace-pre-wrap font-editorial text-sm leading-relaxed text-slate-700">
                    {post.analysis.extractedText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Zone (55% / 7 cols): Dynamic Study & Active Solving Deck */}
        <section aria-label="풀이·첨삭·해석 학습 노트" className="xl:col-span-7 flex flex-col">
          {/* Tab Strip */}
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="tablist">
              {studyTabs
                .filter((t) => t.show)
                .map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          {/* Tab Panel Content */}
          <div className="p-5 sm:p-7 flex-1 space-y-6">
            {/* TAB: 객관식 문제 직접 풀기 & 해설 */}
            {activeTab === 'answer' && hasProblem && post.analysis.problemSection && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {getLanguageLabel(post.languageFormat)} · {post.analysis.problemSection.questionType}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">정답</span>
                      {!revealProblemSolution ? (
                        <span className="font-mono-tabular text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                          아래에서 선지를 고르고 채점해 보세요
                        </span>
                      ) : (
                        <span className="font-editorial text-2xl font-bold text-blue-700 tabular-nums">
                          {post.analysis.problemSection.correctAnswer}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {revealProblemSolution ? (
                      <button
                        type="button"
                        onClick={handleResetChoiceAttempt}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>다시 풀어보기</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealProblemSolution(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>해설 바로 보기</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Interactive Multiple-Choice Attempt (before revealing) */}
                {!revealProblemSolution && post.analysis.problemSection.choices.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-700">
                      직접 선지를 선택한 뒤 채점해 보세요
                    </p>
                    <div className="space-y-2">
                      {post.analysis.problemSection.choices.map((choice, idx) => {
                        const selected = choiceDraft === choice.label;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setChoiceDraft(choice.label)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-baseline gap-3 cursor-pointer ${
                              selected
                                ? 'bg-blue-50 border-blue-600 text-blue-950'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900'
                            }`}
                          >
                            <span className="font-mono-tabular text-sm font-bold shrink-0">
                              {choice.label}
                            </span>
                            <span className="font-editorial text-[15px] leading-relaxed">
                              {choice.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={!choiceDraft}
                        onClick={handleSubmitChoice}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-lg cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>내 답 채점하기</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Revealed Solution & Choice Breakdown */}
                {revealProblemSolution && (
                  <>
                    {post.userSelectedChoice && (
                      <div
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                          userIsCorrectOnChoice
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          {userIsCorrectOnChoice ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                          )}
                          <span>
                            {userIsCorrectOnChoice
                              ? `정답입니다! (선택한 답: ${post.userSelectedChoice})`
                              : `오답입니다. 내 선택 ${post.userSelectedChoice} · 정답 ${post.analysis.problemSection.correctAnswer}`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <h3 className="text-sm font-semibold text-slate-900">정답 도출 근거</h3>
                      <p className="text-[15px] leading-[1.7] text-slate-700">
                        {post.analysis.problemSection.answerSummary}
                      </p>

                      {post.analysis.problemSection.evidenceSentences.length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">핵심 단서 문장 이동:</span>
                          {post.analysis.problemSection.evidenceSentences.map((idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => jumpToEvidenceSentence(idx)}
                              className="px-2.5 py-1 text-xs font-mono-tabular font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                            >
                              {idx}번 문장 확인
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {post.analysis.problemSection.choices.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900">선지별 정·오답 분석</h3>
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                          {post.analysis.problemSection.choices.map((choice, idx) => (
                            <div
                              key={idx}
                              className={`p-4 ${
                                choice.isCorrect ? 'bg-emerald-50/50' : 'bg-white'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-baseline gap-2.5">
                                  <span className="font-mono-tabular text-sm font-bold text-slate-900">
                                    {choice.label}
                                  </span>
                                  <span className="font-editorial text-[15px] font-medium text-slate-900">
                                    {choice.text}
                                  </span>
                                </div>
                                {choice.isCorrect ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>정답</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 shrink-0">
                                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>오답</span>
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 pl-6">
                                {choice.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB: 영작 4단계 빌드업 & 모범 답안 */}
            {activeTab === 'writing_guide' && hasWriting && post.analysis.writingSection && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {getLanguageLabel(post.languageFormat)} · {post.analysis.writingSection.writingType}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {post.analysis.writingSection.koreanPrompt || koreanInstruction}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('writing_grade')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>직접 영작하고 첨삭받기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHideWritingModel((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {hideWritingModel ? (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>모범 답안 보기</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>모범 답안 가리기</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Context Template & Evidence Links */}
                {(post.analysis.writingSection.contextTemplate ||
                  post.analysis.writingSection.evidenceSentences.length > 0) && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    {post.analysis.writingSection.contextTemplate && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600">문맥 완성 틀</p>
                        <p className="mt-1 font-editorial text-[15px] text-slate-900">
                          {post.analysis.writingSection.contextTemplate}
                        </p>
                      </div>
                    )}
                    {post.analysis.writingSection.evidenceSentences.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-slate-500">지문 단서 문장:</span>
                        {post.analysis.writingSection.evidenceSentences.map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => jumpToEvidenceSentence(idx)}
                            className="px-2.5 py-1 text-xs font-mono-tabular font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md cursor-pointer"
                          >
                            {idx}번 문장 확인
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {hideWritingModel ? (
                  <div className="py-10 px-6 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
                    <p className="text-sm font-medium text-slate-800">
                      모범 답안과 빌드업 풀이가 가려져 있습니다.
                    </p>
                    <p className="text-xs text-slate-500">
                      "직접 영작하고 첨삭받기" 탭에서 먼저 내 답안을 작성해 AI 채점을 받아보세요.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Final Model Answer */}
                    <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-blue-900">모범 영작 정답</span>
                        <span className="font-mono-tabular text-xs text-blue-800">
                          {countWords(post.analysis.writingSection.modelAnswer)}단어
                        </span>
                      </div>
                      <p className="font-editorial text-lg font-semibold text-slate-950 leading-relaxed">
                        {post.analysis.writingSection.modelAnswer}
                      </p>
                      {post.analysis.writingSection.alternativeAnswers.length > 0 && (
                        <div className="pt-2 border-t border-blue-200/70 space-y-1">
                          <p className="text-[11px] font-semibold text-blue-900">인정 가능한 대체 답안</p>
                          {post.analysis.writingSection.alternativeAnswers.map((alt, idx) => (
                            <p key={idx} className="font-editorial text-sm text-slate-800">
                              · {alt}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4-Step Buildup */}
                    {post.analysis.writingSection.steps.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          뼈대 잡기부터 조건 적용까지 — 단계별 영작 빌드업
                        </h3>
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                          {post.analysis.writingSection.steps.map((step) => (
                            <div key={step.stepNumber} className="p-4 bg-white space-y-1.5">
                              <p className="text-xs font-semibold text-blue-800">{step.title}</p>
                              <p className="font-editorial text-[15px] font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                {step.englishDraft}
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600">
                                {step.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deduction Points */}
                    {post.analysis.writingSection.deductionPoints.length > 0 && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>내신 서술형 감점 주의 포인트</span>
                        </div>
                        <ul className="space-y-1 text-sm text-slate-700">
                          {post.analysis.writingSection.deductionPoints.map((pt, idx) => (
                            <li key={idx} className="leading-relaxed">
                              · {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB: 내 영작 답안 입력 & AI 조건별 첨삭 */}
            {activeTab === 'writing_grade' && hasWriting && post.analysis.writingSection && (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700">영작 과제 &amp; 필수 조건</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {post.analysis.writingSection.koreanPrompt || koreanInstruction}
                  </p>
                  {post.analysis.writingSection.contextTemplate && (
                    <p className="font-editorial text-sm text-blue-900 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      {post.analysis.writingSection.contextTemplate}
                    </p>
                  )}
                  {givenWords.length > 0 && (
                    <p className="text-xs text-slate-600">
                      <strong className="font-semibold text-slate-700">&lt;보기&gt;</strong>{' '}
                      <span className="font-editorial">{givenWords.join(', ')}</span>
                    </p>
                  )}
                  {conditions.length > 0 && (
                    <ul className="space-y-1 text-xs text-slate-600">
                      {conditions.map((c, idx) => (
                        <li key={idx}>
                          {idx + 1}. {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Student Answer Input Form */}
                <form onSubmit={handleGradeWriting} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`writing-input-${post.id}`} className="text-xs font-semibold text-slate-700">
                      내 영작 답안 작성
                    </label>
                    <span className="font-mono-tabular text-xs text-slate-500">
                      현재 {countWords(writingDraft)}단어
                    </span>
                  </div>
                  <textarea
                    id={`writing-input-${post.id}`}
                    value={writingDraft}
                    onChange={(e) => setWritingDraft(e.target.value)}
                    rows={3}
                    placeholder={
                      post.analysis.writingSection.contextTemplate
                        ? '빈칸에 들어갈 영어 어구 또는 문장을 입력하세요...'
                        : '조건에 맞춰 영작한 문장을 입력하세요...'
                    }
                    className="w-full p-3.5 font-editorial text-[16px] leading-relaxed bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
                  />

                  {gradingError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {gradingError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={gradingWriting || !writingDraft.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {gradingWriting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          <span>조건별 AI 채점 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>AI 첨삭·채점 받기</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Grading History */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">
                    첨삭·채점 기록 ({writingAttempts.length})
                  </h3>

                  {writingAttempts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">
                      아직 제출한 영작 답안이 없습니다. 위 입력창에 직접 영작해 보고 AI 채점을 받아보세요.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {writingAttempts.map((attempt) => {
                        const verdictStyle =
                          attempt.verdict === 'correct'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : attempt.verdict === 'partial'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-red-50 border-red-200 text-red-800';
                        const verdictText =
                          attempt.verdict === 'correct'
                            ? '정답 · 만점 수준'
                            : attempt.verdict === 'partial'
                              ? '부분 감점 · 보완 필요'
                              : '재작성 권장';

                        return (
                          <div
                            key={attempt.id}
                            className="p-4 border border-slate-200 rounded-xl bg-white space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${verdictStyle}`}
                              >
                                {attempt.verdict === 'correct' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : attempt.verdict === 'partial' ? (
                                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                                <span>
                                  {verdictText} · {attempt.scoreLabel}
                                </span>
                              </span>
                              <span className="font-mono-tabular text-xs text-slate-400">
                                {formatFullDate(attempt.createdAt)}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold text-slate-500">내가 쓴 답안</p>
                              <p className="font-editorial text-[15px] text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                {attempt.userAnswer}
                              </p>
                            </div>

                            {attempt.conditionChecks.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold text-slate-500">조건별 체크</p>
                                <div className="space-y-1">
                                  {attempt.conditionChecks.map((chk, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="flex items-start gap-2 text-xs leading-relaxed"
                                    >
                                      {chk.passed ? (
                                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold shrink-0 pt-0.5">
                                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                          <span>충족</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 text-red-700 font-semibold shrink-0 pt-0.5">
                                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                          <span>미충족</span>
                                        </span>
                                      )}
                                      <span className="text-slate-700">
                                        <strong className="font-medium text-slate-900">
                                          {chk.conditionText}
                                        </strong>{' '}
                                        — {chk.comment}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {attempt.correctedSentence && (
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-blue-800">교정·추천 문장</p>
                                <p className="font-editorial text-[15px] font-semibold text-blue-950 bg-blue-50/60 border border-blue-200 rounded-lg px-3 py-2">
                                  {attempt.correctedSentence}
                                </p>
                              </div>
                            )}

                            <p className="text-sm leading-relaxed text-slate-700">
                              {attempt.feedbackKorean}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: 직독직해·해석 */}
            {activeTab === 'literal' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <p className="text-xs text-slate-500">
                    {post.languageFormat === 'korean'
                      ? '완성된 영어 모범 답안을 의미 단위(/)로 끊어 직독직해합니다.'
                      : '의미 단위(/)로 끊어 영어 어순 그대로 직독직해하고 전체 흐름을 익히세요.'}
                  </p>
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {[
                      { id: 'parallel' as const, label: '영문·직독직해 병렬' },
                      { id: 'chunked' as const, label: '끊어읽기 집중' },
                      { id: 'natural' as const, label: '자연스러운 전체 해석' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setLiteralMode(m.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          literalMode === m.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {literalMode === 'natural' ? (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500">전체 우리말 해석</h3>
                    <p className="text-[15px] leading-[1.85] text-slate-800">
                      {post.analysis.sentences.map((s) => s.naturalTranslation).join(' ')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {post.analysis.sentences.map((s) => (
                      <div key={s.index} className="py-4 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="font-mono-tabular text-xs font-semibold text-slate-400 pt-1 shrink-0">
                            {String(s.index).padStart(2, '0')}
                          </span>
                          <div className="space-y-2 flex-1">
                            <p className="font-editorial text-[16px] leading-[1.7] text-slate-900">
                              {s.chunked.split('/').map((chunk, idx, arr) => (
                                <span key={idx}>
                                  <span>{chunk.trim()}</span>
                                  {idx < arr.length - 1 && (
                                    <span className="text-blue-600 font-sans font-bold mx-1.5">/</span>
                                  )}
                                </span>
                              ))}
                            </p>

                            <p className="text-sm leading-relaxed text-blue-900/90 bg-blue-50/50 border border-blue-100 rounded-lg px-3.5 py-2.5">
                              {s.literalTranslation.split('/').map((chunk, idx, arr) => (
                                <span key={idx}>
                                  <span>{chunk.trim()}</span>
                                  {idx < arr.length - 1 && (
                                    <span className="text-blue-400 font-bold mx-1.5">/</span>
                                  )}
                                </span>
                              ))}
                            </p>

                            {literalMode === 'parallel' && (
                              <p className="text-sm leading-relaxed text-slate-600">
                                <span className="text-xs font-semibold text-slate-400 mr-2">의역</span>
                                {s.naturalTranslation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: 문장·구문 분석 */}
            {activeTab === 'grammar' && (
              <div className="space-y-5">
                <p className="text-xs text-slate-500 pb-3 border-b border-slate-200">
                  내신 서술형과 수능 어법·구문 독해에 자주 출제되는 문장별 핵심 포인트를 정리했습니다.
                </p>
                <div className="divide-y divide-slate-200">
                  {post.analysis.sentences.map((s) => (
                    <div key={s.index} className="py-5 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="font-mono-tabular text-xs font-semibold text-slate-400 pt-1 shrink-0">
                          {String(s.index).padStart(2, '0')}
                        </span>
                        <div className="space-y-1.5 flex-1">
                          <p className="font-editorial text-[16px] leading-relaxed text-slate-900">
                            {s.original}
                          </p>
                          <p className="text-sm text-slate-600">{s.naturalTranslation}</p>
                        </div>
                      </div>

                      {s.grammarPoints.length > 0 ? (
                        <div className="pl-7 space-y-2.5">
                          {s.grammarPoints.map((gp, gIdx) => (
                            <div
                              key={gIdx}
                              className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                            >
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-xs font-semibold text-blue-800">
                                  {gp.pointTitle}
                                </span>
                                <span className="text-slate-300" aria-hidden="true">·</span>
                                <code className="font-editorial text-xs text-slate-800 bg-white px-1.5 py-0.5 border border-slate-200 rounded">
                                  {gp.targetPhrase}
                                </code>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-700">
                                {gp.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pl-7 text-xs text-slate-400">
                          특별한 고난도 문법 요소가 없는 평이한 문장입니다.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: 핵심 어휘 */}
            {activeTab === 'vocab' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="text-xs text-slate-500 tabular-nums">
                    암기 완료 <strong className="text-slate-900">{memorizedCount}</strong> / {post.analysis.vocabulary.length}단어
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHideVocabMeanings((v) => !v);
                      setRevealedVocabIds({});
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      hideVocabMeanings
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {hideVocabMeanings ? (
                      <>
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>전체 뜻 다시 보기</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>뜻 가리기 (암기 테스트)</span>
                      </>
                    )}
                  </button>
                </div>

                {post.analysis.vocabulary.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    추출된 핵심 어휘가 없습니다.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {post.analysis.vocabulary.map((item) => {
                      const isMeaningHidden = hideVocabMeanings && !revealedVocabIds[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                            item.memorized ? 'bg-slate-50/70' : 'bg-white'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="font-editorial text-lg font-bold text-slate-900">
                                {item.word}
                              </span>
                              <span className="font-mono-tabular text-xs text-slate-500">
                                {item.partOfSpeech}
                              </span>
                            </div>

                            <div>
                              {isMeaningHidden ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedVocabIds((prev) => ({ ...prev, [item.id]: true }))
                                  }
                                  className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  클릭하여 뜻 확인
                                </button>
                              ) : (
                                <p className="text-[15px] font-medium text-slate-800">{item.meaning}</p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              {item.synonyms.length > 0 && (
                                <span>
                                  <strong className="font-medium text-slate-600">유의어</strong>{' '}
                                  {item.synonyms.join(', ')}
                                </span>
                              )}
                              {item.antonyms.length > 0 && (
                                <span>
                                  <strong className="font-medium text-slate-600">반의어</strong>{' '}
                                  {item.antonyms.join(', ')}
                                </span>
                              )}
                            </div>

                            {item.exampleInPassage && (
                              <p className="font-editorial text-xs italic text-slate-500">
                                “{item.exampleInPassage}”
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleVocabMemorized(item.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border shrink-0 self-start transition-colors cursor-pointer ${
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
            )}

            {/* TAB: 인터넷 유사 문제 검색 */}
            {activeTab === 'similar' && (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <Globe className="w-4 h-4 text-blue-700" aria-hidden="true" />
                        <h3>인터넷에서 비슷한 문제 · 원문 출처 찾기</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        Google 웹 검색을 통해 이 지문의 기출·교과서·EBS 출처, 내신 변형 문제, 또는 같은 문법·영작 유형 문제를 찾아드립니다.
                      </p>
                    </div>
                  </div>

                  {/* Focus mode selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'csat_variant' as const,
                        title: '수능·내신 변형·기출',
                        desc: '비슷한 변형 문제와 기출 유형',
                      },
                      {
                        id: 'passage_origin' as const,
                        title: '원문 출처·해설 찾기',
                        desc: '모의고사·교재 출처와 해설 웹페이지',
                      },
                      {
                        id: 'grammar_writing' as const,
                        title: '같은 문법·영작 유형',
                        desc: '핵심 구문과 서술형 조건 패턴',
                      },
                    ].map((mode) => {
                      const active = similarFocusMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setSimilarFocusMode(mode.id)}
                          className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-50 border-blue-600 text-blue-950'
                              : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-800'
                          }`}
                        >
                          <p className="text-xs font-semibold">{mode.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{mode.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom keyword + Search CTA */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleFindSimilar();
                    }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <input
                      type="text"
                      value={similarCustomQuery}
                      onChange={(e) => setSimilarCustomQuery(e.target.value)}
                      placeholder="추가 검색 키워드(선택): 예) 능률 김성곤 3과, 고2 9월 모의고사"
                      className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
                    />
                    <button
                      type="submit"
                      disabled={searchingSimilar}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {searchingSimilar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          <span>인터넷 검색 중...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{similarResult ? '다시 검색하기' : '비슷한 문제 찾기'}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {similarError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {similarError}
                    </p>
                  )}
                </div>

                {/* Search Results */}
                {similarResult ? (
                  <div className="space-y-6">
                    {/* Overview & Queries */}
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-blue-800">
                          웹 검색 결과 요약
                        </span>
                        <span className="font-mono-tabular text-xs text-slate-400">
                          {formatFullDate(similarResult.searchedAt)} 검색됨
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                        {similarResult.overviewKorean}
                      </p>
                      {similarResult.searchQueries.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-slate-500 font-medium">사용된 검색어:</span>
                          {similarResult.searchQueries.map((q, qIdx) => (
                            <span
                              key={qIdx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono-tabular text-[11px]"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Similar Problem Cards */}
                    {similarResult.items.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                          발견한 유사 문제 · 변형 포인트 ({similarResult.items.length})
                        </h4>
                        <div className="space-y-3">
                          {similarResult.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-semibold text-blue-700">
                                    {item.sourceName}
                                  </p>
                                  <h5 className="text-sm font-bold text-slate-900 mt-0.5">
                                    {item.title}
                                  </h5>
                                </div>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shrink-0"
                                  >
                                    <span>자료 열기</span>
                                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                  </a>
                                )}
                              </div>

                              {item.matchReason && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  <strong className="font-semibold text-slate-800">연결 포인트:</strong>{' '}
                                  {item.matchReason}
                                </p>
                              )}

                              {item.problemSnippet && (
                                <p className="font-editorial text-[13px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                  {item.problemSnippet}
                                </p>
                              )}

                              {item.studyTip && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  <strong className="font-semibold text-slate-800">대비 팁:</strong>{' '}
                                  {item.studyTip}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Web Sources */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        참고한 웹 출처 링크 ({similarResult.webSources.length})
                      </h4>
                      {similarResult.webSources.length > 0 ? (
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {similarResult.webSources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                  {src.title}
                                </p>
                                <p className="text-[11px] font-mono-tabular text-slate-500 truncate mt-0.5">
                                  {src.domain || src.uri}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 shrink-0">
                                <span>방문</span>
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          직접 연결된 웹 링크가 반환되지 않았습니다. 아래 포털 검색 바로가기로 더 많은 기출 변형 문제를 찾아보세요.
                        </p>
                      )}

                      {/* Direct Portal Fallback Links */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500">포털에서 직접 더 찾기:</span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(
                            similarResult.searchQueries[0] || `${post.title} 영어 변형 문제`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md"
                        >
                          <span>Google 검색 열기</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <a
                          href={`https://search.naver.com/search.naver?query=${encodeURIComponent(
                            similarResult.searchQueries[0] || `${post.title} 영어 내신 변형 문제`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md"
                        >
                          <span>네이버 검색 열기</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 px-6 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      아직 이 노트의 유사 문제를 검색하지 않았습니다.
                    </p>
                    <p className="text-xs text-slate-500">
                      원하는 검색 목적을 고르고 &ldquo;비슷한 문제 찾기&rdquo;를 누르면 웹에서 관련 기출·변형 자료를 찾아 이 노트에 함께 저장합니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Personal Memo & AI Follow-up Q&A */}
            <div className="pt-6 border-t border-slate-200 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`memo-${post.id}`} className="text-xs font-semibold text-slate-700">
                    내 오답·복습 메모
                  </label>
                  <span className="text-xs text-slate-400">
                    {memoSavedNotice ? '브라우저에 자동 저장됨' : '자동 저장'}
                  </span>
                </div>
                <textarea
                  id={`memo-${post.id}`}
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  rows={2}
                  placeholder="헷갈렸던 구문, 영작 어형 변화, 서술형 변형 포인트를 기록하세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-700"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <h3 className="text-xs font-semibold text-slate-800">
                      이 문제·지문에 대해 더 물어보기
                    </h3>
                  </div>
                  {onOpenTutor && (
                    <button
                      type="button"
                      onClick={onOpenTutor}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>1:1 튜터 채팅에서 이어서 대화하기</span>
                    </button>
                  )}
                </div>

                {/* Solving style selector for asking questions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    답변 방식:
                  </span>
                  {[
                    { id: 'balanced' as const, label: '기본 균형' },
                    { id: 'beginner' as const, label: '초보 눈높이' },
                    { id: 'step_by_step' as const, label: '단계별 풀이' },
                    { id: 'concise' as const, label: '핵심만 빠르게' },
                    { id: 'exam_trap' as const, label: '내신·함정 대비' },
                  ].map((st) => {
                    const active = followUpSolveStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFollowUpSolveStyle(st.id)}
                        className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-50 border-blue-600 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(hasWriting
                    ? [
                        '이 문제를 어떤 방식으로 풀고 공부하면 좋을지 추천해 주세요.',
                        '이 영작에서 다른 동의어나 구문으로도 바꿀 수 있나요?',
                        '어형 변형에서 학생들이 가장 많이 실수하는 부분은?',
                      ]
                    : [
                        '이 문제를 어떤 방식으로 풀이·정리하면 가장 이해하기 쉬울지 물어보고 싶어요.',
                        '이 지문에서 내신 서술형으로 나올 만한 핵심 문장은?',
                        '오답 선지가 왜 틀렸는지 근거 문장으로 확실히 짚어주세요.',
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={askingFollowUp}
                      onClick={() => handleAskFollowUp(preset)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {post.followUpHistory.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {post.followUpHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                      >
                        <p className="text-xs font-semibold text-blue-800">Q. {item.question}</p>
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {followUpError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {followUpError}
                  </p>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskFollowUp(followUpInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="예: 왜 이 자리에 동명사 대신 to부정사를 쓰나요?"
                    className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="submit"
                    disabled={askingFollowUp || !followUpInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {askingFollowUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>질문하기</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="px-5 sm:px-8 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>이 노트는 현재 기기 브라우저(IndexedDB)에 안전하게 보관되어 있습니다.</span>
        <button
          type="button"
          onClick={onOpenSnapStudio}
          className="font-semibold text-blue-700 hover:underline whitespace-nowrap cursor-pointer"
        >
          다른 문제 찍어서 올리기
        </button>
      </div>
    </article>
  );
}
