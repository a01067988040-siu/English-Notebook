import { StudyPost } from '../types/study';

function buildExamPaperSvgDataUrl(opts: {
  header: string;
  questionNumber: string;
  promptLine: string;
  bodyLines: string[];
  extraBoxTitle?: string;
  extraBoxLines?: string[];
  choices?: string[];
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const bodyYStart = 128;
  const lineHeight = 25;
  const bodySvg = opts.bodyLines
    .map((line, i) => {
      const y = bodyYStart + i * lineHeight;
      return `<text x="48" y="${y}" font-family="Georgia, 'Noto Sans KR', serif" font-size="14" fill="#1e293b">${esc(line)}</text>`;
    })
    .join('\n');

  let cursorY = bodyYStart + opts.bodyLines.length * lineHeight + 18;

  let extraBoxSvg = '';
  if (opts.extraBoxLines && opts.extraBoxLines.length > 0) {
    const boxHeight = 32 + opts.extraBoxLines.length * 22;
    const boxLinesSvg = opts.extraBoxLines
      .map((line, i) => {
        const y = cursorY + 42 + i * 22;
        return `<text x="64" y="${y}" font-family="'Plus Jakarta Sans', 'Noto Sans KR', sans-serif" font-size="13" fill="#334155">${esc(line)}</text>`;
      })
      .join('\n');

    extraBoxSvg = `
      <rect x="48" y="${cursorY}" width="584" height="${boxHeight}" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="64" y="${cursorY + 22}" font-family="'Plus Jakarta Sans', 'Noto Sans KR', sans-serif" font-size="11.5" font-weight="700" fill="#475569">${esc(opts.extraBoxTitle || '<보기 및 조건>')}</text>
      ${boxLinesSvg}
    `;
    cursorY += boxHeight + 18;
  }

  const choicesSvg = (opts.choices || [])
    .map((choice, i) => {
      const y = cursorY + 12 + i * 24;
      return `<text x="56" y="${y}" font-family="Georgia, 'Noto Sans KR', serif" font-size="13.5" fill="#334155">${esc(choice)}</text>`;
    })
    .join('\n');

  const totalHeight = cursorY + (opts.choices?.length || 0) * 24 + 46;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${totalHeight}" viewBox="0 0 680 ${totalHeight}">
  <rect width="680" height="${totalHeight}" fill="#fdfcf8"/>
  <rect x="20" y="18" width="640" height="${totalHeight - 36}" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="48" y="48" font-family="'Plus Jakarta Sans', 'Noto Sans KR', sans-serif" font-size="11" font-weight="600" fill="#64748b">${esc(opts.header)}</text>
  <line x1="48" y1="60" x2="632" y2="60" stroke="#cbd5e1" stroke-width="1"/>
  <text x="48" y="92" font-family="'Plus Jakarta Sans', 'Noto Sans KR', sans-serif" font-size="14.5" font-weight="700" fill="#0f172a">${esc(opts.questionNumber)} ${esc(opts.promptLine)}</text>
  ${bodySvg}
  ${extraBoxSvg}
  ${choicesSvg}
  <text x="48" y="${totalHeight - 28}" font-family="monospace" font-size="10" fill="#94a3b8">Sample Worksheet Scan · PassageNote Archive</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createSamplePosts(): StudyPost[] {
  const now = Date.now();

  const sampleProblemImage = buildExamPaperSvgDataUrl({
    header: '2026학년도 고3 영어 모의평가 · [영어 문제] 빈칸 추론',
    questionNumber: '31.',
    promptLine: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
    bodyLines: [
      'When we repeatedly encounter the same problem, we tend to rely on',
      'established mental shortcuts rather than analyzing every detail anew.',
      'While this habit saves cognitive energy in routine situations, it can',
      'quietly blind us to subtle shifts in context. As a result, experienced',
      'practitioners often overlook novel solutions precisely because their',
      'past success makes them ______________________________.',
    ],
    choices: [
      '① overly dependent on familiar patterns',
      '② eager to abandon proven methods',
      '③ cautious about repeating earlier mistakes',
      '④ indifferent to efficiency in daily tasks',
      '⑤ quick to question their own assumptions',
    ],
  });

  const sampleMixedWritingImage = buildExamPaperSvgDataUrl({
    header: '고2 영어 내신 서술형 기출 · [한·영 혼합 문제]',
    questionNumber: '서술형 2.',
    promptLine: '윗글을 읽고, 아래 요약문의 빈칸을 <조건>에 맞게 영작하시오.',
    bodyLines: [
      'Taking a brief pause before finalizing a decision allows the brain',
      'to integrate scattered observations that conscious effort often misses.',
      'Researchers found that students who stepped away from a difficult',
      'puzzle for ten minutes generated more original answers than those',
      'who kept working without interruption.',
      '',
      '→ Summary: Brief breaks help students [ ________________________ ].',
    ],
    extraBoxTitle: '<보기 및 조건>',
    extraBoxLines: [
      '보기: creative / by / scattered / solutions / connect / allow / observations',
      '조건 1. <보기>의 단어 중 필요한 것을 모두 사용하고, 필요시 어형을 변형할 것',
      '조건 2. 「사역/준사역 + 접속/전치사 + 동명사」 흐름으로 8단어 이내 작성',
    ],
  });

  const sampleKoreanWritingImage = buildExamPaperSvgDataUrl({
    header: '중3·고1 내신 영작 서술형 · [한국어 문제]',
    questionNumber: '서술형 4.',
    promptLine: '다음 우리말에 맞도록 <조건>에 따라 영어로 문장을 완성하시오.',
    bodyLines: [
      '“네가 방금 말한 것은 그 문제를 해결하는 데 가장 중요한 열쇠이다.”',
    ],
    extraBoxTitle: '<보기 및 조건>',
    extraBoxLines: [
      '보기: key / solve / say / just / important / the problem',
      '조건 1. 선행사를 포함한 관계대명사 what으로 문장을 시작할 것',
      '조건 2. "solve"는 문맥에 맞게 어형을 변형할 것 (to부정사 또는 동명사)',
      '조건 3. 주어진 단어를 모두 활용하되 필요시 관사·전치사·be동사 추가 가능',
    ],
  });

  const problemPost: StudyPost = {
    id: 'sample-csat-31',
    createdAt: now - 1000 * 60 * 60 * 2,
    updatedAt: now - 1000 * 60 * 60 * 2,
    title: '익숙한 사고 패턴이 창의적 해결책을 가리는 이유',
    sourceTag: '고3 모의평가 · 빈칸 31번',
    languageFormat: 'english',
    postType: 'problem',
    studyStatus: 'review_needed',
    imageDataUrl: sampleProblemImage,
    userMemo: 'rather than ~ 구문과 As a result 앞뒤 인과관계 다시 체크하기!',
    userSelectedChoice: null,
    writingAttempts: [],
    isSample: true,
    followUpHistory: [],
    analysis: {
      title: '익숙한 사고 패턴이 창의적 해결책을 가리는 이유',
      languageFormat: 'english',
      detectedPostType: 'problem',
      extractedText: `31. 다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?
When we repeatedly encounter the same problem, we tend to rely on established mental shortcuts rather than analyzing every detail anew. While this habit saves cognitive energy in routine situations, it can quietly blind us to subtle shifts in context. As a result, experienced practitioners often overlook novel solutions precisely because their past success makes them ______________________________.

① overly dependent on familiar patterns
② eager to abandon proven methods
③ cautious about repeating earlier mistakes
④ indifferent to efficiency in daily tasks
⑤ quick to question their own assumptions`,
      koreanInstruction: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
      givenWords: [],
      conditions: [],
      summaryKorean:
        '반복적인 문제 상황에서 과거의 성공 경험으로 굳어진 인지적 지름길에 지나치게 의존하게 되면, 상황의 미묘한 변화를 놓쳐 새로운 해결책을 간과하기 쉽다는 글입니다.',
      problemSection: {
        questionType: '빈칸 추론',
        correctAnswer: '①',
        answerSummary:
          '글 전반부에서 반복된 문제에 대해 "established mental shortcuts(기존의 정신적 지름길)"에 의존하는 습관이 맥락의 미묘한 변화를 보지 못하게 만든다고 서술했습니다. 따라서 As a result로 이어지는 결론에서 숙련자들이 새로운 해결책을 놓치는 이유는 과거의 성공이 그들을 "익숙한 패턴에 지나치게 의존하게 만들기(overly dependent on familiar patterns)" 때문이라는 ①번이 정답입니다.',
        evidenceSentences: [1, 2, 3],
        choices: [
          {
            label: '①',
            text: 'overly dependent on familiar patterns',
            isCorrect: true,
            explanation:
              '정답입니다. 앞 문장의 "rely on established mental shortcuts"를 "familiar patterns에 과도하게 의존한다"로 정확히 재진술했습니다.',
          },
          {
            label: '②',
            text: 'eager to abandon proven methods',
            isCorrect: false,
            explanation:
              '오답입니다. 입증된 방법을 버리려 한다(abandon)는 것은 기존의 지름길에 의존한다는 글의 핵심 내용과 정반대입니다.',
          },
          {
            label: '③',
            text: 'cautious about repeating earlier mistakes',
            isCorrect: false,
            explanation:
              '오답입니다. 과거의 실수가 아니라 과거의 성공(past success) 때문에 익숙한 방식에 안주한다는 맥락입니다.',
          },
          {
            label: '④',
            text: 'indifferent to efficiency in daily tasks',
            isCorrect: false,
            explanation:
              '오답입니다. 일상 업무의 효율성에 무관심한 것이 아니라 오히려 에너지를 아끼는 습관 때문에 발생합니다.',
          },
          {
            label: '⑤',
            text: 'quick to question their own assumptions',
            isCorrect: false,
            explanation:
              '오답입니다. 자신의 가정을 의심한다면 새로운 해결책을 놓치지 않을 것이므로 문맥과 모순됩니다.',
          },
        ],
      },
      writingSection: null,
      sentences: [
        {
          index: 1,
          original:
            'When we repeatedly encounter the same problem, we tend to rely on established mental shortcuts rather than analyzing every detail anew.',
          chunked:
            'When we repeatedly encounter / the same problem, / we tend to rely on / established mental shortcuts / rather than analyzing / every detail anew.',
          literalTranslation:
            '우리가 반복적으로 마주할 때 / 같은 문제를 / 우리는 의존하는 경향이 있다 / 이미 자리 잡은 정신적 지름길에 / 분석하기보다는 / 모든 세부 사항을 새롭게.',
          naturalTranslation:
            '우리가 같은 문제를 반복해서 마주할 때, 모든 세부 사항을 새롭게 분석하기보다는 기존의 정신적 지름길에 의존하는 경향이 있다.',
          grammarPoints: [
            {
              pointTitle: '전치사구 병렬 & 동명사 (rather than ~ing)',
              targetPhrase: 'rather than analyzing every detail anew',
              explanation:
                'rather than은 "~하기보다는"이라는 의미로 앞선 rely on과 대조되는 행동으로 동명사 analyzing을 취했습니다.',
            },
          ],
        },
        {
          index: 2,
          original:
            'While this habit saves cognitive energy in routine situations, it can quietly blind us to subtle shifts in context.',
          chunked:
            'While this habit saves / cognitive energy / in routine situations, / it can quietly blind us / to subtle shifts / in context.',
          literalTranslation:
            '이 습관이 아껴 주기는 하지만 / 인지적 에너지를 / 일상적인 상황에서 / 그것은 조용히 우리 눈을 가릴 수 있다 / 미묘한 변화들에 대해 / 맥락 속의.',
          naturalTranslation:
            '이러한 습관은 일상적인 상황에서 인지적 에너지를 절약해 주기는 하지만, 맥락의 미묘한 변화에 대해 우리의 눈을 조용히 멀게 할 수 있다.',
          grammarPoints: [
            {
              pointTitle: '양보의 접속사 While',
              targetPhrase: 'While this habit saves cognitive energy',
              explanation:
                'While은 "~이지만, ~임에도 불구하고"라는 대조의 뜻으로 주절의 부정적 결과(blind us)와 대비됩니다.',
            },
          ],
        },
        {
          index: 3,
          original:
            'As a result, experienced practitioners often overlook novel solutions precisely because their past success makes them overly dependent on familiar patterns.',
          chunked:
            'As a result, / experienced practitioners / often overlook novel solutions / precisely because / their past success makes them / overly dependent on familiar patterns.',
          literalTranslation:
            '그 결과 / 숙련된 실무자들은 / 종종 새로운 해결책을 간과한다 / 바로 ~때문에 / 그들의 과거 성공이 그들을 만들기 때문에 / 익숙한 패턴에 지나치게 의존하도록.',
          naturalTranslation:
            '그 결과 숙련된 실무자들은 과거의 성공이 자신들을 익숙한 패턴에 지나치게 의존하게 만들기 때문에 새로운 해결책을 간과하는 경우가 많다.',
          grammarPoints: [
            {
              pointTitle: '5형식 (make + 목적어 + 형용사)',
              targetPhrase: 'makes them overly dependent on familiar patterns',
              explanation:
                'make의 목적격 보어로 형용사 dependent가 왔으며, 부사 overly가 dependent를 수식합니다.',
            },
          ],
        },
      ],
      vocabulary: [
        {
          id: 'sv-1',
          word: 'encounter',
          partOfSpeech: 'v.',
          meaning: '(어려움·문제 등을) 마주치다, 접하다',
          synonyms: ['face', 'confront'],
          antonyms: ['avoid'],
          exampleInPassage: 'repeatedly encounter the same problem',
          memorized: false,
        },
        {
          id: 'sv-2',
          word: 'subtle',
          partOfSpeech: 'adj.',
          meaning: '미묘한, 감지하기 어려운',
          synonyms: ['slight', 'delicate'],
          antonyms: ['obvious'],
          exampleInPassage: 'subtle shifts in context',
          memorized: false,
        },
        {
          id: 'sv-3',
          word: 'overlook',
          partOfSpeech: 'v.',
          meaning: '간과하다, 못 보고 넘어가다',
          synonyms: ['ignore', 'neglect'],
          antonyms: ['notice'],
          exampleInPassage: 'often overlook novel solutions',
          memorized: false,
        },
      ],
    },
  };

  const mixedWritingPost: StudyPost = {
    id: 'sample-mixed-writing-01',
    createdAt: now - 1000 * 60 * 60 * 10,
    updatedAt: now - 1000 * 60 * 60 * 10,
    title: '휴식이 창의적 문제 해결을 돕는 이유 (요약문 영작)',
    sourceTag: '고2 내신 서술형 · 한영 혼합',
    languageFormat: 'mixed',
    postType: 'writing',
    studyStatus: 'review_needed',
    imageDataUrl: sampleMixedWritingImage,
    userMemo: 'help + 목적어 + 동사원형(find/generate)과 by + -ing(connecting) 어형 변형 주의!',
    userSelectedChoice: null,
    writingAttempts: [],
    isSample: true,
    followUpHistory: [],
    analysis: {
      title: '휴식이 창의적 문제 해결을 돕는 이유 (요약문 영작)',
      languageFormat: 'mixed',
      detectedPostType: 'writing',
      extractedText: `서술형 2. 윗글을 읽고, 아래 요약문의 빈칸을 <조건>에 맞게 영작하시오.

Taking a brief pause before finalizing a decision allows the brain to integrate scattered observations that conscious effort often misses. Researchers found that students who stepped away from a difficult puzzle for ten minutes generated more original answers than those who kept working without interruption.

→ Summary: Brief breaks help students [ ________________________ ].

<보기> creative / by / scattered / solutions / connect / allow / observations
<조건>
1. <보기>의 단어 중 필요한 것을 모두 사용하고, 필요시 어형을 변형할 것
2. 「전치사 by + 동명사」 흐름을 포함하여 8단어 이내로 작성할 것`,
      koreanInstruction: '윗글을 읽고, 요약문 "Brief breaks help students [ ___ ]"의 빈칸을 <조건>에 맞게 영작하시오.',
      givenWords: ['creative', 'by', 'scattered', 'solutions', 'find', 'connect', 'observations'],
      conditions: [
        '<보기>의 단어 중 필요한 것을 활용하고, 필요시 어형을 변형할 것',
        '「전치사 by + 동명사」 구조를 포함하여 8단어 이내로 작성할 것',
      ],
      summaryKorean:
        '영어 본문에서 "잠시의 휴식이 흩어진 관찰을 통합해 독창적인 답을 찾게 해준다"는 단서를 찾은 뒤, 요약문 빈칸을 준사역동사 help의 목적격 보어와 「by + 동명사」 구문으로 영작하는 한·영 혼합 서술형 문제입니다.',
      problemSection: null,
      writingSection: {
        writingType: '한·영 혼합 요약문 빈칸 영작',
        koreanPrompt: '흩어진 관찰들을 연결함으로써 창의적인 해결책들을 찾도록 (돕는다)',
        contextTemplate: 'Brief breaks help students [ ________________________ ].',
        givenWords: ['creative', 'by', 'scattered', 'solutions', 'find', 'connect', 'observations'],
        conditions: [
          '<보기>의 핵심 단어들을 문맥에 맞게 활용하고 필요시 어형을 변형할 것',
          '「전치사 by + 동명사」 구조를 포함하여 8단어 이내로 작성할 것',
        ],
        evidenceSentences: [1, 2],
        modelAnswer: 'find creative solutions by connecting scattered observations',
        alternativeAnswers: ['generate creative solutions by connecting scattered observations'],
        steps: [
          {
            stepNumber: 1,
            title: '1단계: 지문 속 핵심 단서 찾기 및 빈칸 위치 확인',
            englishDraft: 'help students [동사원형 / to부정사 + 목적어]',
            explanation:
              '앞선 틀이 "Brief breaks help students [ ___ ]"이므로, 준사역동사 help의 목적격 보어로 동사원형(또는 to부정사)이 바로 이어져야 합니다.',
          },
          {
            stepNumber: 2,
            title: '2단계: 핵심 행동(창의적 해결책을 찾다) 배치',
            englishDraft: 'find creative solutions',
            explanation:
              '본문 2번 문장의 "generated more original answers"에 대응하는 핵심 행동인 "창의적인 해결책을 찾다"를 먼저 배치합니다.',
          },
          {
            stepNumber: 3,
            title: '3단계: <조건> 「by + 동명사」 어형 변형 적용',
            englishDraft: 'by connecting scattered observations',
            explanation:
              '전치사 by 뒤에는 반드시 동명사(-ing)가 와야 하므로 connect를 connecting으로 변형하고, 본문 1번 문장의 "scattered observations"를 목적어로 연결합니다.',
          },
          {
            stepNumber: 4,
            title: '4단계: 단어 수 점검 및 최종 문장 완성',
            englishDraft: 'find creative solutions by connecting scattered observations',
            explanation:
              '총 7단어(8단어 이내 조건 충족)이며, 앞뒤 문맥과 합치면 "Brief breaks help students find creative solutions by connecting scattered observations."로 완벽히 호응합니다.',
          },
        ],
        deductionPoints: [
          '전치사 by 뒤에 동사원형 connect를 그대로 쓰면 감점됩니다 (connecting 필수).',
          '앞 문맥이 "help students"이므로 빈칸 시작에 동명사(finding)나 -s형(finds)을 쓰면 어법 오류로 감점됩니다.',
          '단어 수 제한(8단어 이내)을 넘기지 않도록 불필요한 관사나 수식어를 추가하지 마세요.',
        ],
      },
      sentences: [
        {
          index: 1,
          original:
            'Taking a brief pause before finalizing a decision allows the brain to integrate scattered observations that conscious effort often misses.',
          chunked:
            'Taking a brief pause / before finalizing a decision / allows the brain / to integrate scattered observations / that conscious effort often misses.',
          literalTranslation:
            '짧은 휴식을 취하는 것은 / 결정을 최종 확정하기 전에 / 뇌가 ~하도록 허용한다 / 흩어진 관찰들을 통합하도록 / 의식적인 노력이 종종 놓치는.',
          naturalTranslation:
            '결정을 내리기 전 잠시 휴식을 취하면, 뇌가 의식적인 노력으로는 놓치기 쉬운 흩어진 관찰들을 통합할 수 있다.',
          grammarPoints: [
            {
              pointTitle: '5형식 동사 (allow + 목적어 + to부정사)',
              targetPhrase: 'allows the brain to integrate',
              explanation:
                'allow는 목적격 보어로 to부정사를 취합니다. integrate는 요약문 영작에서 connect로 재진술되었습니다.',
            },
          ],
        },
        {
          index: 2,
          original:
            'Researchers found that students who stepped away from a difficult puzzle for ten minutes generated more original answers than those who kept working without interruption.',
          chunked:
            'Researchers found that / students who stepped away from a difficult puzzle / for ten minutes / generated more original answers / than those who kept working / without interruption.',
          literalTranslation:
            '연구자들은 ~라는 것을 발견했다 / 어려운 퍼즐에서 잠시 물러났던 학생들이 / 10분 동안 / 더 독창적인 답을 만들어냈다는 것을 / 계속 작업했던 학생들보다 / 중단 없이.',
          naturalTranslation:
            '연구자들은 어려운 퍼즐에서 10분간 떨어져 있던 학생들이 쉬지 않고 일한 학생들보다 더 독창적인 답안을 냈다는 것을 발견했다.',
          grammarPoints: [
            {
              pointTitle: '대명사 those (복수명사 students 지칭)',
              targetPhrase: 'than those who kept working',
              explanation:
                '비교 구문에서 복수명사 students를 대신 받을 때는 that이 아니라 those를 써야 합니다.',
            },
          ],
        },
      ],
      vocabulary: [
        {
          id: 'smw-1',
          word: 'integrate',
          partOfSpeech: 'v.',
          meaning: '통합하다, 연결해 합치다',
          synonyms: ['combine', 'connect', 'merge'],
          antonyms: ['separate'],
          exampleInPassage: 'integrate scattered observations',
          memorized: false,
        },
        {
          id: 'smw-2',
          word: 'interruption',
          partOfSpeech: 'n.',
          meaning: '중단, 방해',
          synonyms: ['disruption', 'break'],
          antonyms: ['continuation'],
          exampleInPassage: 'kept working without interruption',
          memorized: false,
        },
      ],
    },
  };

  const koreanWritingPost: StudyPost = {
    id: 'sample-korean-writing-01',
    createdAt: now - 1000 * 60 * 60 * 24,
    updatedAt: now - 1000 * 60 * 60 * 24,
    title: '관계대명사 what을 활용한 조건부 영작',
    sourceTag: '고1 내신 서술형 · 한국어 영작',
    languageFormat: 'korean',
    postType: 'writing',
    studyStatus: 'mastered',
    imageDataUrl: sampleKoreanWritingImage,
    userMemo: '관계대명사 what절은 단수 취급(is)! 전치사 to 뒤에는 동명사 solving 주의.',
    userSelectedChoice: null,
    writingAttempts: [],
    isSample: true,
    followUpHistory: [],
    analysis: {
      title: '관계대명사 what을 활용한 조건부 영작',
      languageFormat: 'korean',
      detectedPostType: 'writing',
      extractedText: `서술형 4. 다음 우리말에 맞도록 <조건>에 따라 영어로 문장을 완성하시오.

"네가 방금 말한 것은 그 문제를 해결하는 데 가장 중요한 열쇠이다."

<보기> key / solve / say / just / important / the problem
<조건>
1. 선행사를 포함한 관계대명사 what으로 문장을 시작할 것
2. "solve"는 문맥에 맞게 어형을 변형할 것 (전치사 to 뒤 동명사)
3. 주어진 단어를 모두 활용하되 필요시 관사·전치사·be동사 추가 가능`,
      koreanInstruction: '다음 우리말("네가 방금 말한 것은 그 문제를 해결하는 데 가장 중요한 열쇠이다.")에 맞도록 <조건>에 따라 영작하시오.',
      givenWords: ['key', 'solve', 'say', 'just', 'important', 'the problem'],
      conditions: [
        '선행사를 포함한 관계대명사 what으로 문장을 시작할 것',
        '"solve"는 문맥에 맞게 어형을 변형할 것',
        '주어진 단어를 모두 활용하되 필요시 관사·전치사·be동사를 추가할 것',
      ],
      summaryKorean:
        '선행사를 포함한 관계대명사 what절을 주어로 놓고, 명사 key와 짝을 이루는 전치사 to 뒤 동명사(to solving ~) 구문을 완성하는 한국어 제시문 기반 조건 영작 문제입니다.',
      problemSection: null,
      writingSection: {
        writingType: '조건부 영작 (한국어 제시문)',
        koreanPrompt: '네가 방금 말한 것은 그 문제를 해결하는 데 가장 중요한 열쇠이다.',
        contextTemplate: '',
        givenWords: ['key', 'solve', 'say', 'just', 'important', 'the problem'],
        conditions: [
          '선행사를 포함한 관계대명사 what으로 문장을 시작할 것',
          '"solve"는 문맥에 맞게 어형을 변형할 것',
          '주어진 단어를 모두 활용하되 필요시 관사·전치사·be동사를 추가할 것',
        ],
        evidenceSentences: [],
        modelAnswer: 'What you just said is the most important key to solving the problem.',
        alternativeAnswers: ['What you have just said is the most important key to solving the problem.'],
        steps: [
          {
            stepNumber: 1,
            title: '1단계: 주어 뼈대(관계대명사 what절) 잡기',
            englishDraft: 'What you just said',
            explanation:
              '"네가 방금 말한 것"은 선행사를 포함한 관계대명사 what(~하는 것)을 사용해 What you just said로 씁니다. say는 과거 시제 said로 변형합니다.',
          },
          {
            stepNumber: 2,
            title: '2단계: 단수 be동사 및 최상급 보어 연결',
            englishDraft: 'is the most important key',
            explanation:
              'what절이 주어일 때는 단수 취급하므로 동사는 is를 쓰고, "가장 중요한 열쇠"를 최상급 표현 the most important key로 연결합니다.',
          },
          {
            stepNumber: 3,
            title: '3단계: <조건> key to ~ing 어형 변형 적용',
            englishDraft: 'to solving the problem',
            explanation:
              '"~하는 데 열쇠(비결)"라는 뜻의 「the key to + 명사/동명사」에서 to는 전치사이므로, solve를 반드시 동명사 solving으로 바꿉니다.',
          },
          {
            stepNumber: 4,
            title: '4단계: 전체 문장 결합 및 조건 점검',
            englishDraft: 'What you just said is the most important key to solving the problem.',
            explanation:
              'what으로 시작했고, <보기> 단어를 모두 사용했으며, solve를 solving으로 어형 변형해 모든 조건을 완벽히 충족했습니다.',
          },
        ],
        deductionPoints: [
          'the key to 뒤를 to부정사(to solve)로 착각하여 동사원형을 쓰면 내신에서 가장 많이 감점됩니다 (전치사 to + 동명사 solving!).',
          '주어 What you just said가 단수 취급되므로 be동사에 are가 아닌 is를 써야 합니다.',
          '최상급 앞에 정관사 the(the most important)를 빠뜨리지 않도록 주의하세요.',
        ],
      },
      sentences: [
        {
          index: 1,
          original: 'What you just said is the most important key to solving the problem.',
          chunked: 'What you just said / is / the most important key / to solving the problem.',
          literalTranslation: '네가 방금 말한 것은 / ~이다 / 가장 중요한 열쇠 / 그 문제를 해결하는 데에 대한.',
          naturalTranslation: '네가 방금 말한 것은 그 문제를 해결하는 데 가장 중요한 열쇠이다.',
          grammarPoints: [
            {
              pointTitle: '관계대명사 what 주어 + 단수 동사',
              targetPhrase: 'What you just said is',
              explanation:
                'what은 the thing that의 의미로 명사절을 이끌며, 주어 역할을 할 때 단수 동사(is)와 수 일치합니다.',
            },
            {
              pointTitle: '전치사 to + 동명사 (the key to ~ing)',
              targetPhrase: 'key to solving the problem',
              explanation:
                'key to, contribute to, look forward to 등의 to는 전치사이므로 뒤에 동명사(-ing)나 명사가 옵니다.',
            },
          ],
        },
      ],
      vocabulary: [
        {
          id: 'skw-1',
          word: 'key to',
          partOfSpeech: 'phr.',
          meaning: '~에 대한 핵심, 비결, 열쇠 (뒤에 명사/동명사)',
          synonyms: ['secret to', 'solution to'],
          antonyms: [],
          exampleInPassage: 'key to solving the problem',
          memorized: true,
        },
      ],
    },
  };

  return [problemPost, mixedWritingPost, koreanWritingPost];
}
