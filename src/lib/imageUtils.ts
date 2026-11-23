export interface CropRect {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  width: number; // normalized 0..1
  height: number; // normalized 0..1
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          '이 사진 형식을 브라우저에서 읽지 못했습니다. (iPhone HEIC 파일이라면 스크린샷 또는 JPG/PNG로 올려주세요.)'
        )
      );
    img.src = src;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('파일 데이터를 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

export async function rotateImageDataUrl(src: string, degrees: 90 | -90): Promise<string> {
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 컨텍스트를 초기화할 수 없습니다.');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export async function cropAndCompressImage(
  src: string,
  crop: CropRect | null,
  maxDimension = 1280
): Promise<{ dataUrl: string; mimeType: string }> {
  const img = await loadImageElement(src);

  const sx = crop ? Math.max(0, Math.round(crop.x * img.naturalWidth)) : 0;
  const sy = crop ? Math.max(0, Math.round(crop.y * img.naturalHeight)) : 0;
  const sw = crop ? Math.max(20, Math.round(crop.width * img.naturalWidth)) : img.naturalWidth;
  const sh = crop ? Math.max(20, Math.round(crop.height * img.naturalHeight)) : img.naturalHeight;

  const clampedSw = Math.min(sw, img.naturalWidth - sx);
  const clampedSh = Math.min(sh, img.naturalHeight - sy);

  const scale = Math.min(1, maxDimension / Math.max(clampedSw, clampedSh));
  const targetW = Math.max(1, Math.round(clampedSw * scale));
  const targetH = Math.max(1, Math.round(clampedSh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 컨텍스트를 초기화할 수 없습니다.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, sx, sy, clampedSw, clampedSh, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
  return { dataUrl, mimeType: 'image/jpeg' };
}
