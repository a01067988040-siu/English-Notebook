import { StudyPost } from '../types/study';
import { createSamplePosts } from '../data/samplePosts';

const DB_NAME = 'PassageNoteDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';
const SEED_FLAG_KEY = 'passagenote_seeded_v2';

function normalizePost(raw: StudyPost): StudyPost {
  const analysis = raw.analysis || ({} as StudyPost['analysis']);
  const languageFormat =
    raw.languageFormat || analysis?.languageFormat || 'english';
  const imageDataUrls =
    Array.isArray(raw.imageDataUrls) && raw.imageDataUrls.length > 0
      ? raw.imageDataUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)
      : raw.imageDataUrl
        ? [raw.imageDataUrl]
        : [];

  const problemSection = analysis?.problemSection
    ? {
        ...analysis.problemSection,
        questionType: analysis.problemSection.questionType || '문제 풀이',
        correctAnswer: analysis.problemSection.correctAnswer || '',
        answerSummary: analysis.problemSection.answerSummary || '',
        evidenceSentences: Array.isArray(analysis.problemSection.evidenceSentences)
          ? analysis.problemSection.evidenceSentences
          : [],
        choices: Array.isArray(analysis.problemSection.choices)
          ? analysis.problemSection.choices
          : [],
      }
    : null;

  const writingSection = analysis?.writingSection
    ? {
        ...analysis.writingSection,
        writingType: analysis.writingSection.writingType || '서술형 영작',
        koreanPrompt: analysis.writingSection.koreanPrompt || '',
        contextTemplate: analysis.writingSection.contextTemplate || '',
        givenWords: Array.isArray(analysis.writingSection.givenWords)
          ? analysis.writingSection.givenWords
          : [],
        conditions: Array.isArray(analysis.writingSection.conditions)
          ? analysis.writingSection.conditions
          : [],
        evidenceSentences: Array.isArray(analysis.writingSection.evidenceSentences)
          ? analysis.writingSection.evidenceSentences
          : [],
        modelAnswer: analysis.writingSection.modelAnswer || '',
        alternativeAnswers: Array.isArray(analysis.writingSection.alternativeAnswers)
          ? analysis.writingSection.alternativeAnswers
          : [],
        steps: Array.isArray(analysis.writingSection.steps)
          ? analysis.writingSection.steps
          : [],
        deductionPoints: Array.isArray(analysis.writingSection.deductionPoints)
          ? analysis.writingSection.deductionPoints
          : [],
      }
    : null;

  return {
    ...raw,
    title: raw.title || analysis?.title || '영어 학습 노트',
    sourceTag: raw.sourceTag ?? '',
    userMemo: raw.userMemo ?? '',
    languageFormat,
    imageDataUrl: imageDataUrls[0] ?? null,
    imageDataUrls,
    solvePreference: raw.solvePreference ?? 'balanced',
    solveRequestNote: raw.solveRequestNote ?? '',
    userSelectedChoice: raw.userSelectedChoice ?? null,
    writingAttempts: Array.isArray(raw.writingAttempts) ? raw.writingAttempts : [],
    similarSearch: raw.similarSearch ?? null,
    followUpHistory: Array.isArray(raw.followUpHistory) ? raw.followUpHistory : [],
    analysis: {
      ...analysis,
      title: analysis?.title || raw.title || '영어 학습 노트',
      languageFormat,
      detectedPostType: analysis?.detectedPostType || raw.postType || 'passage',
      extractedText: analysis?.extractedText ?? '',
      koreanInstruction: analysis?.koreanInstruction ?? '',
      givenWords: Array.isArray(analysis?.givenWords) ? analysis.givenWords : [],
      conditions: Array.isArray(analysis?.conditions) ? analysis.conditions : [],
      summaryKorean: analysis?.summaryKorean ?? '',
      problemSection,
      writingSection,
      sentences: Array.isArray(analysis?.sentences) ? analysis.sentences : [],
      vocabulary: Array.isArray(analysis?.vocabulary) ? analysis.vocabulary : [],
    },
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저는 IndexedDB 로컬 저장을 지원하지 않습니다.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('로컬 데이터베이스를 여는 데 실패했습니다.'));
  });
}

export async function getAllPosts(): Promise<StudyPost[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items = ((req.result as StudyPost[]) || []).map(normalizePost);
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error || new Error('학습 노트를 불러오지 못했습니다.'));
  });
}

export async function savePost(post: StudyPost): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(normalizePost(post));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('학습 노트를 저장하지 못했습니다.'));
  });
}

export async function deletePost(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('학습 노트를 삭제하지 못했습니다.'));
  });
}

export async function clearAllPosts(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('저장소를 비우지 못했습니다.'));
  });
}

export async function bulkSavePosts(posts: StudyPost[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const post of posts) {
      store.put(normalizePost(post));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('가져오기 저장에 실패했습니다.'));
  });
}

export async function initializeAndLoadPosts(): Promise<StudyPost[]> {
  const existing = await getAllPosts();
  const alreadySeeded = localStorage.getItem(SEED_FLAG_KEY);

  if (!alreadySeeded) {
    const samples = createSamplePosts();
    const existingIds = new Set(existing.map((p) => p.id));
    const missingSamples = samples.filter((s) => !existingIds.has(s.id));

    if (missingSamples.length > 0 && (existing.length === 0 || existing.every((p) => p.isSample))) {
      await bulkSavePosts(missingSamples);
      localStorage.setItem(SEED_FLAG_KEY, '1');
      return getAllPosts();
    }
    localStorage.setItem(SEED_FLAG_KEY, '1');
  }

  return existing;
}

export async function restoreSamplePosts(): Promise<StudyPost[]> {
  const samples = createSamplePosts();
  await bulkSavePosts(samples);
  localStorage.setItem(SEED_FLAG_KEY, '1');
  return getAllPosts();
}

export function estimatePostsSizeBytes(posts: StudyPost[]): number {
  try {
    const json = JSON.stringify(posts);
    return new Blob([json]).size;
  } catch {
    return 0;
  }
}
