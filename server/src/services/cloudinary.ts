import crypto from 'crypto';

/**
 * Cloudinary (image hosting) through its REST API with signed requests: no SDK needed.
 * Credentials: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */
const settings = () => ({
  cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || '').replace(/"/g, '').trim(),
  apiKey: String(process.env.CLOUDINARY_API_KEY || '').replace(/"/g, '').trim(),
  apiSecret: String(process.env.CLOUDINARY_API_SECRET || '').replace(/"/g, '').trim(),
});

/** Folder for images uploaded from the admin panel (only these are deleted together with their asset) */
export const ASSET_FOLDER = 'hexpertify/assets';

export function cloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = settings();
  return Boolean(cloudName && apiKey && apiSecret && cloudName !== 'local_cloud');
}

/** Cloudinary's signature: SHA-1 of the sorted params (key=value&…) followed by the API secret */
function sign(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

export interface UploadedFile {
  url: string;
  publicId: string;
  bytes: number;
  /** image, video (also audio) or raw: needed to delete it later */
  resourceType: string;
}

/** Uploads a file (a data: URI or a remote URL; images, PDFs, audio, video) and returns its https URL on Cloudinary */
export async function uploadToCloudinary(file: string, folder = ASSET_FOLDER): Promise<UploadedFile> {
  const { cloudName, apiKey, apiSecret } = settings();
  if (!cloudinaryConfigured()) {
    throw new Error('Image hosting (Cloudinary) is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  }
  const params = { folder, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new URLSearchParams({ ...params, file, api_key: apiKey, signature: sign(params, apiSecret) });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: form });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.secure_url) {
    throw new Error(`Upload failed: ${data?.error?.message || res.statusText || 'unknown error'}`);
  }
  return { url: data.secure_url, publicId: data.public_id, bytes: Number(data.bytes) || 0, resourceType: data.resource_type || 'image' };
}

/** Removes an uploaded file from Cloudinary (best effort: a failure is logged, never thrown) */
export async function deleteFromCloudinary(publicId: string, resourceType = 'image'): Promise<void> {
  const { cloudName, apiKey, apiSecret } = settings();
  if (!publicId || !cloudinaryConfigured()) return;
  try {
    const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new URLSearchParams({ ...params, api_key: apiKey, signature: sign(params, apiSecret) });
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType || 'image'}/destroy`, { method: 'POST', body: form });
  } catch (err: any) {
    console.warn('[Cloudinary] Could not delete', publicId, err?.message || err);
  }
}
