import { api } from './apiClient';

const MAX_SIDE = 1920;

/** Reads a file as a data: URL */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Photos straight from a phone or camera are several MB. Raster images are scaled down to at most 1920 px on the
 * longer side and re-encoded as WebP, which keeps uploads small and fast (and under the hosting request limit).
 * SVG and GIF are kept as they are; so is any image that would not get smaller.
 */
async function shrinkImage(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  if (/image\/(svg\+xml|gif)/.test(file.type)) return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const webp = canvas.toDataURL('image/webp', 0.85);
    return webp.startsWith('data:image/webp') && webp.length < original.length ? webp : original;
  } catch {
    return original;
  }
}

/**
 * Uploads an image to Assets and returns its URL (e.g. /api/assets/<id>/file?v=…), ready to put in any image
 * field. `type` is the Assets label (Banner, Icon, Consultant, Blog, Images…).
 */
export async function uploadImageAsset(file: File, options: { name?: string; type?: string } = {}): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (PNG, JPG, WEBP, SVG or GIF).');
  const dataUrl = await shrinkImage(file);
  const data = await api.post<any>('/api/admin/assets', {
    name: (options.name || file.name.replace(/\.[^.]+$/, '')).trim() || 'Image',
    type: options.type || 'Images',
    url: dataUrl,
    uploadedDate: new Date().toISOString().split('T')[0],
  });
  const url = data?.asset?.url;
  if (!url) throw new Error('The image was not saved. Please try again.');
  return url;
}
