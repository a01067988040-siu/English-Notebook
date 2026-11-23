import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MessageSquareText,
  PenTool,
  RotateCcw,
  Send,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import {
  SolveStylePreference,
  TutorChatContext,
  TutorChatMessage,
  TutorRoleId,
} from '../types/study';

interface TutorChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext: TutorChatContext | null;
}

const STORAGE_KEY = 'passagenote_tutor_chat_v1';

const TUTOR_ROLES: Array<{
  id: TutorRoleId;
  label: string;
  desc: string;
  icon: typeof BookOpen;
}> = [
  {
    id: 'tutor',
    label: '1:1 내신·수능 튜터',
    desc: '구문·어법·정답 근거 심층 질의응답',
    icon: BookOpen,
  },
  {
    id: 'writing_coach',
    label: '서술형 영작 코치',
    desc: '어순·조건 적용·표현 다듬기 코칭',
    icon: PenTool,
  },
  {
    id: 'quick_quiz',
    label: '스피드 퀴즈 파트너',
    desc: '핵심 어휘·어법 빈칸 즉석 퀴즈',
    icon: Zap,
  },
];

const CONDITION_PRESETS: string[] = [
  '중등·초보 눈높이로 쉽게',
  '직독직해 끊어읽기 포함',
  '오답 ①~⑤ 전부 1:1 설명',
  '3줄 핵심 요약',
  '유사 변형 문제 1개 출제',
  '내신 감점·어형 변화 체크',
];

function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TutorChatDrawer({
  isOpen,
  onClose,
  activeContext,
}: TutorChatDrawerProps) {
  const [roleId, setRoleId] = useState<TutorRoleId>('tutor');
  const [solvePreference, setSolvePreference] = useState<SolveStylePreference>('balanced');
  const [attachContext, setAttachContext] = useState<boolean>(true);
  const [showCustomComposer, setShowCustomComposer] = useState<boolean>(true);
  const [customCondition, setCustomCondition] = useState<string>('');
  const [customContent, setCustomContent] = useState<string>('');
  const [messages, setMessages] = useState<TutorChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (m): m is TutorChatMessage =>
              Boolean(m) &&
              typeof m.id === 'string' &&
              (m.role === 'user' || m.role === 'model') &&
              typeof m.text === 'string'
          );
        }
      }
    } catch {
      // ignore invalid stored chat
    }
    return [];
  });
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore storage quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        textareaRef.current?.focus();
      }, 60);
    }
  }, [isOpen, messages.length]);

  const toggleConditionPreset = (preset: string) => {
    setCustomCondition((prev) => {
      const tokens = prev
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.includes(preset)) {
        return tokens.filter((t) => t !== preset).join(', ');
      }
      return [...tokens, preset].join(', ');
    });
  };

  const sendMessage = async (rawText: string) => {
    const trimmedQuestion = rawText.trim();
    const trimmedCond = customCondition.trim();
    const trimmedCont = customContent.trim();

    if ((!trimmedQuestion && !trimmedCont) || sending) return;

    const displayQuestion =
      trimmedQuestion || '위 조건과 첨부한 내용에 맞춰 자세히 풀이·설명해 주세요.';

    const userMsg: TutorChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: displayQuestion,
      createdAt: Date.now(),
      tutorRole: roleId,
      customCondition: trimmedCond || undefined,
      customContent: trimmedCont || undefined,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setCustomContent('');
    setSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedQuestion,
          roleId,
          solvePreference,
          customCondition: trimmedCond,
          customContent: trimmedCont,
          history: messages.slice(-14).map((m) => ({
            role: m.role,
            text:
              m.role === 'user' && (m.customCondition || m.customContent)
                ? [
                    m.customCondition ? `[요청 조건] ${m.customCondition}` : '',
                    m.customContent ? `[첨부 내용] ${m.customContent}` : '',
                    m.text,
                  ]
                    .filter(Boolean)
                    .join('\n')
                : m.text,
          })),
          context: attachContext && activeContext ? activeContext : null,
        }),
      });

      const rawBody = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(`서버 응답을 해석하지 못했습니다 (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' && data.error
            ? data.error
            : `답변 생성에 실패했습니다 (HTTP ${res.status}).`
        );
      }

      const modelMsg: TutorChatMessage = {
        id: `msg-m-${Date.now()}`,
        role: 'model',
        text: String(data.reply || ''),
        createdAt: Date.now(),
        tutorRole: roleId,
        modelUsed: typeof data.modelUsed === 'string' ? data.modelUsed : undefined,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setErrorMsg(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const starterPrompts = (() => {
    if (roleId === 'writing_coach') {
      return activeContext
        ? [
            '이 문제에서 꼭 챙겨야 할 영작 <조건>과 감점 함정을 짚어주세요.',
            '제가 먼저 영작 문장을 써볼 테니 어색한 부분을 봐주세요.',
            '관계대명사와 분사구문을 구분해서 영작하는 팁을 알려주세요.',
          ]
        : [
            '내신 서술형 영작에서 감점을 피하는 체크리스트를 알려주세요.',
            '우리말 문장을 영어 주어·동사 뼈대로 바꾸는 연습을 하고 싶어요.',
          ];
    }
    if (roleId === 'quick_quiz') {
      return activeContext
        ? [
            '현재 보고 있는 지문의 핵심 어휘로 빈칸 퀴즈 1문제만 내주세요!',
            '이 지문에 나온 문법 포인트로 OX 퀴즈를 바로 출제해 주세요.',
          ]
        : [
            '수능 빈출 필수 영단어 퀴즈 1문제만 내주세요!',
            '관계대명사 vs 관계부사 구분 OX 퀴즈를 시작해 주세요.',
          ];
    }
    return activeContext
      ? [
          '이 문제를 어떤 방식으로 풀이해주면 좋을지 먼저 추천받고 선택하고 싶어요!',
          '현재 보고 있는 지문의 글 흐름과 주제를 3줄로 쉽게 정리해 주세요.',
          '이 문제의 정답이 왜 확실한지 근거 문장으로 꼼꼼히 검증해 주세요.',
        ]
      : [
          '제가 올린 문제를 어떤 방식으로 풀고 질문하면 가장 효과적일까요?',
          '분사구문과 관계대명사의 차이를 예문과 함께 쉽게 설명해 주세요.',
        ];
  })();

  if (!isOpen) return null;

  const activeRoleMeta = TUTOR_ROLES.find((r) => r.id === roleId) || TUTOR_ROLES[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-xs">
      <div
        className="flex-1"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutor-chat-title"
        className="w-full max-w-[490px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              <MessageSquareText className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="tutor-chat-title" className="text-sm font-bold text-slate-900 truncate">
                AI 영어 학습 튜터
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {activeRoleMeta.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                disabled={sending}
                title="새 대화 시작"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>초기화</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="튜터 창 닫기"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Role Selector + Active Note Context */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            {TUTOR_ROLES.map((r) => {
              const Icon = r.icon;
              const active = roleId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoleId(r.id)}
                  className={`px-2 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-white border-blue-600 text-blue-900 shadow-2xs'
                      : 'bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.label.replace('1:1 ', '').replace(' 파트너', '')}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Solve style selector */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-500 mr-1">풀이 방식:</span>
            {[
              { id: 'balanced' as const, label: '균형' },
              { id: 'beginner' as const, label: '초보 눈높이' },
              { id: 'step_by_step' as const, label: '단계별' },
              { id: 'concise' as const, label: '핵심요약' },
              { id: 'exam_trap' as const, label: '내신·함정' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSolvePreference(st.id)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  solvePreference === st.id
                    ? 'bg-blue-50 border-blue-600 text-blue-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {activeContext && (
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={attachContext}
                  onChange={(e) => setAttachContext(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-700 cursor-pointer"
                />
                <span className="text-slate-600 shrink-0">현재 노트 연결:</span>
                <span className="font-semibold text-slate-900 truncate">{activeContext.title}</span>
              </div>
            </label>
          )}
        </div>

        {/* Scrollable Conversation Thread */}
        <div className="flex-1 min-h-[140px] overflow-y-auto p-4 space-y-4 bg-slate-50/70">
          {messages.length === 0 ? (
            <div className="py-6 space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-blue-800">
                  {activeRoleMeta.label} 준비 완료
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  {attachContext && activeContext
                    ? `현재 열려 있는 "${activeContext.title}" 노트의 원문과 풀이를 참고하여 여러 차례 이어서 질문하고 답변을 받을 수 있습니다.`
                    : '영어 문법, 독해 전략, 서술형 영작, 어휘 퀴즈까지 궁금한 내용을 자유롭게 물어보세요. 대화 맥락이 그대로 이어집니다.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 px-1">추천 시작 질문</p>
                <div className="space-y-1.5">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={sending}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 bg-white hover:bg-blue-50/70 hover:text-blue-900 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const roleBadge =
                TUTOR_ROLES.find((r) => r.id === msg.tutorRole)?.label || 'AI 튜터';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">
                      {isUser ? '나' : roleBadge}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatMessageTime(msg.createdAt)}</span>
                  </div>
                  <div
                    className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {isUser && (msg.customCondition || msg.customContent) && (
                      <div className="mb-2 pb-2 border-b border-blue-500/40 space-y-1.5 text-[11px] text-blue-100">
                        {msg.customCondition && (
                          <div className="leading-snug">
                            <span className="font-semibold text-white">조건:</span> {msg.customCondition}
                          </div>
                        )}
                        {msg.customContent && (
                          <div className="p-2 rounded-md bg-blue-800/70 text-blue-50 whitespace-pre-wrap max-h-28 overflow-y-auto">
                            <span className="block font-semibold text-white mb-0.5">첨부 내용</span>
                            {msg.customContent}
                          </div>
                        )}
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start">
              <div className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" aria-hidden="true" />
                <span>지정하신 조건과 내용으로 답변을 정리하고 있습니다...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Input Composer with Custom Condition & Custom Content */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-3.5 border-t border-slate-200 bg-white space-y-2.5 shrink-0"
        >
          {/* Collapsible toggle bar for custom conditions & custom content */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowCustomComposer((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-md cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              <span>원하는 조건 · 질문 내용 지정</span>
              {(customCondition.trim() || customContent.trim()) && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-700 text-white rounded">
                  적용중
                </span>
              )}
              {showCustomComposer ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              )}
            </button>

            {(customCondition.trim() || customContent.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setCustomCondition('');
                  setCustomContent('');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                조건·내용 비우기
              </button>
            )}
          </div>

          {showCustomComposer && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 max-h-[260px] overflow-y-auto">
              {/* Custom Condition */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="tutor-custom-condition" className="text-[11px] font-semibold text-slate-700">
                    원하는 답변 조건
                  </label>
                  <span className="text-[10px] text-slate-400">클릭해서 빠른 추가</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {CONDITION_PRESETS.map((preset) => {
                    const active = customCondition.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => toggleConditionPreset(preset)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-50 border-blue-600 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="tutor-custom-condition"
                  type="text"
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  placeholder="예: 중3 눈높이로, 어법 용어 풀어서, 변형 문제 1개까지 만들어줘"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
                />
              </div>

              {/* Custom Content */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="tutor-custom-content" className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    <span>질문할 내용 (지문·문제·내 영작·단어)</span>
                  </label>
                  {activeContext?.extractedText && (
                    <button
                      type="button"
                      onClick={() => setCustomContent(activeContext.extractedText)}
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      현재 노트 원문 가져오기
                    </button>
                  )}
                </div>
                <textarea
                  id="tutor-custom-content"
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  rows={2}
                  placeholder="따로 물어보고 싶은 영어 지문, 한·영 혼합 문제, 내 영작 문장 등을 붙여넣거나 적어주세요."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 resize-y focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                customContent.trim()
                  ? '질문 입력 (비워두고 보내도 위 조건·내용에 맞춰 풀이해 줍니다)'
                  : '질문, 영작 문장, 또는 퀴즈 요청을 입력하세요... (Enter 전송)'
              }
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:bg-white focus:border-blue-700"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !customContent.trim())}
              aria-label="메시지 보내기"
              className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            설정한 조건은 다음 질문에도 유지되며, 대화 내역은 현재 브라우저에 저장됩니다.
          </p>
        </form>
      </aside>
    </div>
  );
}
