import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AnalysisModeRequest,
  AnalysisResult,
  SolveStylePreference,
  StudyPost,
} from '../types/study';
import {
  CropRect,
  cropAndCompressImage,
  fileToDataUrl,
  rotateImageDataUrl,
} from '../lib/imageUtils';

interface SnapStudioModalProps {
  isOpen: boolean;
  initialImageDataUrl: string | null;
  onClose: () => void;
  onCreatedPost: (post: StudyPost) => Promise<void>;
}

interface PendingPhoto {
  id: string;
  rawUrl: string;
  cropRect: CropRect | null;
}

const MAX_PHOTOS = 6;

const PROGRESS_STEPS = [
  '사진에서 영어·한국어 문제와 <조건>을 정밀 판독하고 있습니다...',
  '정답 근거·선지 소거·영작 뼈대를 이중 검증하고 있습니다...',
  '요청하신 풀이 방식에 맞춰 직독직해·구문·어휘 노트를 구성하고 있습니다...',
];

const SOLVE_STYLE_OPTIONS: Array<{
  id: SolveStylePreference;
  label: string;
  desc: string;
}> = [
  { id: 'balanced', label: '기본 균형', desc: '근거·해석·어휘 균형' },
  { id: 'beginner', label: '초보 눈높이', desc: '쉬운 용어·뼈대 위주' },
  { id: 'step_by_step', label: '단계별 풀이', desc: '1→2→3단계 논리 흐름' },
  { id: 'concise', label: '핵심만 빠르게', desc: '정답·오답 핵심 요약' },
  { id: 'exam_trap', label: '내신·함정 대비', desc: '변형·감점 포인트 집중' },
];

export function SnapStudioModal({
  isOpen,
  initialImageDataUrl,
  onClose,
  onCreatedPost,
}: SnapStudioModalProps) {
  const [inputTab, setInputTab] = useState<'photo' | 'text'>('photo');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const [textInput, setTextInput] = useState<string>('');
  const [sourceTag, setSourceTag] = useState<string>('');
  const [requestedType, setRequestedType] = useState<AnalysisModeRequest>('auto');
  const [solvePreference, setSolvePreference] = useState<SolveStylePreference>('balanced');
  const [solveRequestNote, setSolveRequestNote] = useState<string>('');

  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [progressStepIdx, setProgressStepIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAddedPasteRef = useRef<string | null>(null);

  const activePhoto = photos[activePhotoIdx] || null;

  useEffect(() => {
    if (isOpen && initialImageDataUrl && initialImageDataUrl !== lastAddedPasteRef.current) {
      lastAddedPasteRef.current = initialImageDataUrl;
      setInputTab('photo');
      setErrorMsg(null);
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        const next = [
          ...prev,
          { id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rawUrl: initialImageDataUrl, cropRect: null },
        ];
        setActivePhotoIdx(next.length - 1);
        return next;
      });
    }
  }, [isOpen, initialImageDataUrl]);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      lastAddedPasteRef.current = null;
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!submitting) {
      setProgressStepIdx(0);
      return;
    }
    const interval = window.setInterval(() => {
      setProgressStepIdx((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2600);
    return () => window.clearInterval(interval);
  }, [submitting]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleStartLiveCamera = async () => {
    setCameraError(null);
    if (photos.length >= MAX_PHOTOS) {
      setErrorMsg(`사진은 한 번에 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraCaptureInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError('브라우저 카메라 권한을 사용할 수 없어 파일 선택 촬영으로 전환합니다.');
      cameraCaptureInputRef.current?.click();
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPhotos((prev) => {
      const next = [
        ...prev.slice(0, MAX_PHOTOS - 1),
        { id: `ph-${Date.now()}`, rawUrl: dataUrl, cropRect: null },
      ];
      setActivePhotoIdx(next.length - 1);
      return next;
    });
    setErrorMsg(null);
    stopCameraStream();
  };

  const handleFilesPicked = async (fileList: FileList | null | undefined) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`사진은 한 노트에 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }

    const toProcess = incoming.slice(0, remainingSlots);
    const added: PendingPhoto[] = [];

    for (const file of toProcess) {
      const hasImageExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
      if ((file.type && !file.type.startsWith('image/') && !hasImageExt) || (!file.type && !hasImageExt)) {
        setErrorMsg('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
        continue;
      }
      try {
        const url = await fileToDataUrl(file);
        added.push({
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          rawUrl: url,
          cropRect: null,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '이미지를 읽지 못했습니다.');
      }
    }

    if (added.length > 0) {
      setPhotos((prev) => {
        const next = [...prev, ...added].slice(0, MAX_PHOTOS);
        setActivePhotoIdx(next.length - 1);
        return next;
      });
      setErrorMsg(null);
      stopCameraStream();
      if (incoming.length > remainingSlots) {
        setErrorMsg(`최대 ${MAX_PHOTOS}장까지만 추가되어 앞의 ${remainingSlots}장을 첨부했습니다.`);
      }
    }
  };

  const updateActivePhoto = (updater: (p: PendingPhoto) => PendingPhoto) => {
    setPhotos((prev) => prev.map((item, idx) => (idx === activePhotoIdx ? updater(item) : item)));
  };

  const handleRotate = async (deg: 90 | -90) => {
    if (!activePhoto) return;
    try {
      const rotated = await rotateImageDataUrl(activePhoto.rawUrl, deg);
      updateActivePhoto((p) => ({ ...p, rawUrl: rotated, cropRect: null }));
    } catch {
      setErrorMsg('이미지 회전에 실패했습니다.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0) {
        setActivePhotoIdx(0);
      } else if (activePhotoIdx >= next.length) {
        setActivePhotoIdx(next.length - 1);
      } else if (index < activePhotoIdx) {
        setActivePhotoIdx(Math.max(0, activePhotoIdx - 1));
      }
      return next;
    });
  };

  const handleMovePhoto = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    setActivePhotoIdx(target);
  };

  const getNormalizedPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const el = imageContainerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePhoto || submitting) return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingCrop(true);
    setDragStart(pt);
    updateActivePhoto((p) => ({ ...p, cropRect: { x: pt.x, y: pt.y, width: 0, height: 0 } }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStart || !activePhoto) return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (!pt) return;
    const x = Math.min(dragStart.x, pt.x);
    const y = Math.min(dragStart.y, pt.y);
    const width = Math.abs(pt.x - dragStart.x);
    const height = Math.abs(pt.y - dragStart.y);
    updateActivePhoto((p) => ({ ...p, cropRect: { x, y, width, height } }));
  };

  const handlePointerUp = () => {
    if (!isDraggingCrop) return;
    setIsDraggingCrop(false);
    setDragStart(null);
    if (activePhoto?.cropRect && (activePhoto.cropRect.width < 0.04 || activePhoto.cropRect.height < 0.04)) {
      updateActivePhoto((p) => ({ ...p, cropRect: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (inputTab === 'photo' && photos.length === 0) {
      setErrorMsg('먼저 문제나 원문 사진을 1장 이상 촬영하거나 업로드해 주세요.');
      return;
    }
    if (inputTab === 'text' && !textInput.trim()) {
      setErrorMsg('분석할 영어·한국어 문제 또는 지문을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const processedImages: Array<{ imageBase64: string; mimeType: string }> = [];

      if (inputTab === 'photo' && photos.length > 0) {
        const targetDim = photos.length >= 3 ? 1120 : 1280;
        for (const item of photos) {
          const compressed = await cropAndCompressImage(item.rawUrl, item.cropRect, targetDim);
          processedImages.push({
            imageBase64: compressed.dataUrl,
            mimeType: compressed.mimeType,
          });
        }
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: processedImages.length > 0 ? processedImages : undefined,
          textOverride: inputTab === 'text' ? textInput.trim() : undefined,
          requestedType,
          sourceTag: sourceTag.trim(),
          solvePreference,
          solveRequestNote: solveRequestNote.trim(),
        }),
      });

      const rawBody = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(
          `서버 응답을 해석하지 못했습니다 (HTTP ${res.status}). 사진 장수나 용량을 줄이거나 영역을 잘라 다시 시도해 주세요.`
        );
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' && data.error
            ? data.error
            : `분석에 실패했습니다 (HTTP ${res.status}).`
        );
      }

      const analysis = data as unknown as AnalysisResult;
      const now = Date.now();
      const savedUrls = processedImages.map((img) => img.imageBase64);

      const newPost: StudyPost = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `post-${now}`,
        createdAt: now,
        updatedAt: now,
        title: analysis.title || '새 학습 노트',
        sourceTag: sourceTag.trim(),
        languageFormat: analysis.languageFormat || 'english',
        postType: analysis.detectedPostType,
        studyStatus: 'review_needed',
        imageDataUrl: savedUrls[0] ?? null,
        imageDataUrls: savedUrls,
        solvePreference,
        solveRequestNote: solveRequestNote.trim(),
        userMemo: '',
        userSelectedChoice: null,
        writingAttempts: [],
        analysis,
        followUpHistory: [],
      };

      await onCreatedPost(newPost);
      setPhotos([]);
      setActivePhotoIdx(0);
      setTextInput('');
      setSourceTag('');
      setRequestedType('auto');
      setSolvePreference('balanced');
      setSolveRequestNote('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '분석 요청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="snap-studio-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="snap-studio-title" className="text-base sm:text-lg font-bold text-slate-900">
              새 문제·원문 게시하기
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              지문과 문제가 여러 장으로 나뉘어 있어도 최대 {MAX_PHOTOS}장까지 한 번에 올릴 수 있습니다. (<kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">Ctrl+V</kbd> 연속 붙여넣기 지원)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="창 닫기"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Input method tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setInputTab('photo')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  inputTab === 'photo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>사진 촬영·업로드 ({photos.length}/{MAX_PHOTOS})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputTab('text');
                  stopCameraStream();
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  inputTab === 'text'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>텍스트 직접 입력</span>
              </button>
            </div>
          </div>

          {inputTab === 'photo' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFilesPicked(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={cameraCaptureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFilesPicked(e.target.files);
                  e.target.value = '';
                }}
              />

              {isCameraActive ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[360px] object-contain mx-auto"
                  />
                  <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      카메라 닫기
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureFrame}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>이 화면 촬영하기</span>
                    </button>
                  </div>
                </div>
              ) : !activePhoto ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    handleFilesPicked(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDraggingFile
                      ? 'border-blue-600 bg-blue-50/60'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-800">
                    영어 지문, 한국어 영작, 한·영 혼합 문제 사진을 여러 장 올려주세요
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    앞장 본문 + 뒷장 문제처럼 여러 파일을 한꺼번에 선택·드래그하거나 Ctrl+V로 연속 붙여넣을 수 있습니다.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleStartLiveCamera}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>카메라로 찍기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>사진 여러 장 선택</span>
                    </button>
                  </div>
                  {cameraError && (
                    <p className="mt-3 text-xs text-amber-700">{cameraError}</p>
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Crop className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                      <span className="font-semibold text-slate-800 font-mono-tabular">
                        사진 {activePhotoIdx + 1}/{photos.length}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activePhoto.cropRect
                          ? '선택한 영역만 잘라서 분석합니다'
                          : '드래그해 문제 영역을 자르거나 아래에서 사진을 추가하세요'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {activePhoto.cropRect && (
                        <button
                          type="button"
                          onClick={() => updateActivePhoto((p) => ({ ...p, cropRect: null }))}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                        >
                          영역 초기화
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRotate(-90)}
                        title="왼쪽 90도 회전"
                        aria-label="왼쪽 90도 회전"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotate(90)}
                        title="오른쪽 90도 회전"
                        aria-label="오른쪽 90도 회전"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(activePhotoIdx)}
                        title="현재 사진 삭제"
                        aria-label="현재 사진 삭제"
                        className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Active Photo Canvas */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      handleFilesPicked(e.dataTransfer.files);
                    }}
                    className={`p-4 flex justify-center transition-colors ${
                      isDraggingFile ? 'bg-blue-50/70' : 'bg-slate-100/80'
                    }`}
                  >
                    <div
                      ref={imageContainerRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="relative inline-block select-none touch-none cursor-crosshair max-w-full"
                    >
                      <img
                        src={activePhoto.rawUrl}
                        alt={`분석할 문제 사진 ${activePhotoIdx + 1}`}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="max-h-[300px] w-auto block rounded border border-slate-200 bg-white"
                      />
                      {activePhoto.cropRect &&
                        activePhoto.cropRect.width > 0 &&
                        activePhoto.cropRect.height > 0 && (
                          <div
                            aria-hidden="true"
                            style={{
                              left: `${activePhoto.cropRect.x * 100}%`,
                              top: `${activePhoto.cropRect.y * 100}%`,
                              width: `${activePhoto.cropRect.width * 100}%`,
                              height: `${activePhoto.cropRect.height * 100}%`,
                            }}
                            className="absolute border-2 border-blue-600 bg-blue-500/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] pointer-events-none"
                          />
                        )}
                    </div>
                  </div>

                  {/* Multi-Photo Thumbnail Strip + Add More Controls */}
                  <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center gap-2.5">
                    {photos.map((ph, idx) => {
                      const selected = idx === activePhotoIdx;
                      return (
                        <div
                          key={ph.id}
                          className={`relative group border rounded-lg overflow-hidden bg-slate-50 transition-colors ${
                            selected ? 'border-blue-700 ring-2 ring-blue-100' : 'border-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActivePhotoIdx(idx)}
                            className="block w-16 h-16 cursor-pointer"
                            aria-label={`${idx + 1}번 사진 선택`}
                          >
                            <img
                              src={ph.rawUrl}
                              alt={`첨부 사진 ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1 left-1 px-1 py-0.5 text-[10px] font-mono-tabular font-bold bg-slate-900/80 text-white rounded">
                              {idx + 1}
                            </span>
                          </button>

                          {selected && photos.length > 1 && (
                            <div className="flex items-center justify-between bg-slate-100 border-t border-slate-200 px-1 py-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMovePhoto(idx, -1)}
                                aria-label="앞으로 이동"
                                className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === photos.length - 1}
                                onClick={() => handleMovePhoto(idx, 1)}
                                aria-label="뒤로 이동"
                                className="p-0.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {photos.length < MAX_PHOTOS && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-16 px-3 border border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 rounded-lg inline-flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-blue-700" aria-hidden="true" />
                          <span>사진 추가</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStartLiveCamera}
                          className="h-16 px-3 border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 rounded-lg inline-flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-600 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" aria-hidden="true" />
                          <span>촬영 추가</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="direct-text-input" className="block text-xs font-semibold text-slate-700">
                영어 지문, 한국어 영작 문제, 또는 한·영 혼합 문제 텍스트
              </label>
              <textarea
                id="direct-text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={8}
                placeholder="예: 영어 지문 + ①~⑤ 선지, 또는 우리말 제시문 + <보기> + <조건> 영작 문제를 그대로 붙여넣으세요."
                className="w-full p-3.5 text-sm font-editorial leading-relaxed bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
              />
            </div>
          )}

          {/* Solving Style / How to Explain Request */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <span className="block text-xs font-semibold text-slate-800">
                어떻게 문제 풀이를 해드릴까요? (풀이 방식 선택 · 요청)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                원하는 눈높이나 설명 방식을 고르면 정답 근거와 해설을 그에 맞춰 구성해 드립니다.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {SOLVE_STYLE_OPTIONS.map((opt) => {
                const active = solvePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSolvePreference(opt.id)}
                    className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-blue-950'
                        : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={solveRequestNote}
              onChange={(e) => setSolveRequestNote(e.target.value)}
              placeholder="직접 요청하기(선택): 예) 관계대명사 위주로 쉽게 풀고 오답 이유를 자세히 적어줘"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
            />
          </div>

          {/* Metadata & Mode Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="source-tag-input" className="block text-xs font-semibold text-slate-700">
                출처·메모 태그 (선택)
              </label>
              <input
                id="source-tag-input"
                type="text"
                value={sourceTag}
                onChange={(e) => setSourceTag(e.target.value)}
                placeholder="예: 고2 9월 모평 31번, 영어1 4과 서술형"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
              />
              <div className="flex flex-wrap gap-1.5">
                {['수능·모의고사', '내신 객관식', '내신 영작·서술형', '원서·교과서 본문'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSourceTag(preset)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700">분석 모드</span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {[
                  { id: 'auto' as const, label: '자동' },
                  { id: 'problem' as const, label: '객관식' },
                  { id: 'writing' as const, label: '영작' },
                  { id: 'passage' as const, label: '원문' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRequestedType(opt.id)}
                    className={`py-2 px-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      requestedType === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                자동 모드는 영어·한국어·한영 혼합 문제 유형을 스스로 판별합니다.
              </p>
            </div>
          </div>

          {submitting && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-700 animate-spin shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-blue-950">학습 노트 생성 중</p>
                <p className="text-xs text-blue-800 mt-0.5">{PROGRESS_STEPS[progressStepIdx]}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || (inputTab === 'photo' ? photos.length === 0 : !textInput.trim())}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>정밀 분석 중...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {inputTab === 'photo' && photos.length > 1
                      ? `사진 ${photos.length}장 통합 풀이하기`
                      : '해석 및 풀이 게시하기'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
