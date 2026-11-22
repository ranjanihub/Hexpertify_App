/**
 * Moves assets whose file is stored inside the database (a base64 data: URI, in `data` or in `url`) to Cloudinary:
 * uploads the file, then sets the asset's url / publicId / size and removes the inline copy.
 * Safe to run again: assets already on Cloudinary are skipped.
 *
 *   cd server && npx tsx src/scripts/migrate_assets_to_cloudinary.ts
 */
import '../config';
import { connectToDatabase, closeDatabase } from '../db/mongodb';
import { uploadToCloudinary, cloudinaryConfigured } from '../services/cloudinary';

const isDataUri = (v: unknown): v is string => typeof v === 'string' && /^data:[^;,]+;base64,/.test(v);
const readableBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

async function main() {
  if (!cloudinaryConfigured()) throw new Error('Cloudinary is not configured (CLOUDINARY_* in the repo-root .env).');
  const db = await connectToDatabase();
  const assets = await db.collection('Asset').find({ $or: [{ data: { $regex: '^data:' } }, { url: { $regex: '^data:' } }] }).toArray();
  console.log(`Assets stored inline: ${assets.length}`);

  for (const a of assets as any[]) {
    const inline = isDataUri(a.data) ? a.data : a.url;
    try {
      const up = await uploadToCloudinary(inline);
      await db.collection('Asset').updateOne(
        { _id: a._id },
        { $set: { url: up.url, publicId: up.publicId, resourceType: up.resourceType, size: readableBytes(up.bytes), updatedAt: new Date() }, $unset: { data: '' } }
      );
      console.log(`  moved "${a.name}" → ${up.url}`);
    } catch (err: any) {
      console.error(`  FAILED "${a.name}": ${err?.message || err}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
