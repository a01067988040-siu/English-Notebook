export type LanguageFormat = 'english' | 'korean' | 'mixed';

export type PostType = 'problem' | 'writing' | 'passage';

export type StudyStatus = 'review_needed' | 'mastered';

export type AnalysisModeRequest = 'auto' | 'problem' | 'writing' | 'passage';

export interface ChoiceAnalysis {
  label: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ProblemSection {
  questionType: string;
  correctAnswer: string;
  answerSummary: string;
  evidenceSentences: number[];
  choices: ChoiceAnalysis[];
}

export interface WritingStep {
  stepNumber: number;
  title: string;
  englishDraft: string;
  explanation: string;
}

export interface WritingSection {
  writingType: string;
  koreanPrompt: string;
  contextTemplate: string;
  givenWords: string[];
  conditions: string[];
  evidenceSentences: number[];
  modelAnswer: string;
  alternativeAnswers: string[];
  steps: WritingStep[];
  deductionPoints: string[];
}

export interface ConditionCheck {
  conditionText: string;
  passed: boolean;
  comment: string;
}

export interface WritingAttempt {
  id: string;
  createdAt: number;
  userAnswer: string;
  verdict: 'correct' | 'partial' | 'needs_revision';
  scoreLabel: string;
  conditionChecks: ConditionCheck[];
  correctedSentence: string;
  feedbackKorean: string;
}

export interface GrammarPoint {
  pointTitle: string;
  targetPhrase: string;
  explanation: string;
}

export interface SentenceAnalysis {
  index: number;
  original: string;
  chunked: string;
  literalTranslation: string;
  naturalTranslation: string;
  grammarPoints: GrammarPoint[];
}

export interface VocabItem {
  id: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  exampleInPassage: string;
  memorized: boolean;
}

export interface FollowUpItem {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
}

export interface AnalysisResult {
  title: string;
  languageFormat: LanguageFormat;
  detectedPostType: PostType;
  extractedText: string;
  koreanInstruction: string;
  givenWords: string[];
  conditions: string[];
  summaryKorean: string;
  problemSection: ProblemSection | null;
  writingSection: WritingSection | null;
  sentences: SentenceAnalysis[];
  vocabulary: VocabItem[];
}

export interface SimilarWebSource {
  title: string;
  uri: string;
  domain: string;
}

export interface SimilarProblemItem {
  title: string;
  sourceName: string;
  matchReason: string;
  problemSnippet: string;
  studyTip: string;
  url?: string;
}

export type SimilarFocusMode = 'csat_variant' | 'passage_origin' | 'grammar_writing';

export interface SimilarSearchResult {
  searchedAt: number;
  focusMode: SimilarFocusMode;
  overviewKorean: string;
  searchQueries: string[];
  items: SimilarProblemItem[];
  webSources: SimilarWebSource[];
}

export type SolveStylePreference =
  | 'balanced'
  | 'beginner'
  | 'step_by_step'
  | 'concise'
  | 'exam_trap';

export interface StudyPost {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  sourceTag: string;
  languageFormat: LanguageFormat;
  postType: PostType;
  studyStatus: StudyStatus;
  imageDataUrl: string | null;
  imageDataUrls?: string[];
  solvePreference?: SolveStylePreference;
  solveRequestNote?: string;
  userMemo: string;
  userSelectedChoice?: string | null;
  writingAttempts?: WritingAttempt[];
  similarSearch?: SimilarSearchResult | null;
  analysis: AnalysisResult;
  followUpHistory: FollowUpItem[];
  isSample?: boolean;
}

export type AppView = 'feed' | 'review' | 'vocab' | 'backup';

export type StudyTab =
  | 'answer'
  | 'writing_guide'
  | 'writing_grade'
  | 'literal'
  | 'grammar'
  | 'vocab'
  | 'similar';

export type TutorRoleId = 'tutor' | 'writing_coach' | 'quick_quiz';

export interface TutorChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
  tutorRole: TutorRoleId;
  modelUsed?: string;
  customCondition?: string;
  customContent?: string;
}

export interface TutorChatContext {
  postId: string;
  title: string;
  languageFormat: LanguageFormat;
  postType: PostType;
  extractedText: string;
  summaryKorean: string;
  modelAnswer?: string;
}
