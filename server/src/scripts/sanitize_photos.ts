import { connectToDatabase } from '../db/mongodb';

export function normalizeImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('google.com/imgres') || trimmed.includes('imgurl=')) {
    try {
      const match = trimmed.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }
  return trimmed;
}

async function run() {
  const db = await connectToDatabase();
  const directUrl = 'https://media.licdn.com/dms/image/v2/D5603AQFTS1Z73WIlCg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1720859777245?e=2147483647&v=beta&t=yO7E_-3xylunJKT00b03-m9hTVuicUz6qszqtZVflqs';

  // 1. Sanitize all consultants
  const allConsultants = await db.collection('Consultant').find({}).toArray();
  for (const c of allConsultants) {
    const p = normalizeImageUrl(c.photo || c.photoUrl || c.image || c.avatarUrl);
    const updates: any = {};
    if (p) {
      updates.photo = p;
      updates.photoUrl = p;
      updates.image = p;
      updates.avatarUrl = p;
    }
    if (c.name && c.name.includes('Jayakumar')) {
      updates.photo = directUrl;
      updates.photoUrl = directUrl;
      updates.image = directUrl;
      updates.avatarUrl = directUrl;
    }
    if (Object.keys(updates).length > 0) {
      await db.collection('Consultant').updateOne({ _id: c._id }, { $set: updates });
      await db.collection('consultants').updateOne({ _id: c._id }, { $set: updates }).catch(() => {});
    }
  }

  // 2. Sanitize users
  await db.collection('User').updateMany(
    { assignedTherapistName: /Jayakumar/i },
    { $set: { assignedTherapistPhoto: directUrl, therapistPhoto: directUrl, updatedAt: new Date() } }
  );
  await db.collection('users').updateMany(
    { assignedTherapistName: /Jayakumar/i },
    { $set: { assignedTherapistPhoto: directUrl, therapistPhoto: directUrl, updatedAt: new Date() } }
  );

  // 3. Sanitize bookings
  await db.collection('Booking').updateMany(
    { consultantName: /Jayakumar/i },
    { $set: { consultantPhoto: directUrl, therapistPhoto: directUrl, updatedAt: new Date() } }
  );
  await db.collection('bookings').updateMany(
    { consultantName: /Jayakumar/i },
    { $set: { consultantPhoto: directUrl, therapistPhoto: directUrl, updatedAt: new Date() } }
  );

  console.log('Sanitization complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
