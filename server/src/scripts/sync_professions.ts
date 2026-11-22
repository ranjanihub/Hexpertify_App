import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function syncAndFixProfessions() {
  const db = await connectToDatabase();

  const profsLower = await db.collection('professions').find({}).toArray();
  const profsUpper = await db.collection('Profession').find({}).toArray();

  console.log(`Found ${profsLower.length} in "professions" and ${profsUpper.length} in "Profession"`);

  // Merge map by id / identifier
  const professionMap = new Map<string, any>();

  for (const p of profsLower) {
    const key = p.id || String(p._id);
    professionMap.set(key, {
      ...p,
      _id: key,
      id: key,
      name: p.name || p.serviceName || 'Clinical Therapy',
      serviceName: p.serviceName || p.name || 'Clinical Therapy',
      identifier: p.identifier || key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      slug: p.slug || p.identifier || key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: new Date()
    });
  }

  for (const p of profsUpper) {
    const key = p.id || String(p._id);
    const existing = professionMap.get(key) || {};
    professionMap.set(key, {
      ...existing,
      ...p,
      _id: key,
      id: key,
      name: p.name || p.serviceName || existing.name || 'Clinical Therapy',
      serviceName: p.serviceName || p.name || existing.serviceName || 'Clinical Therapy',
      identifier: p.identifier || existing.identifier || key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      slug: p.slug || existing.slug || p.identifier || key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: new Date()
    });
  }

  const merged = Array.from(professionMap.values());
  console.log(`Total merged professions: ${merged.length}`);

  // Update both collections with the complete synced list
  for (const prof of merged) {
    console.log(`Upserting: ${prof.id} -> name: "${prof.name}", serviceName: "${prof.serviceName}", identifier: "${prof.identifier}"`);
    await db.collection('Profession').updateOne(
      { _id: prof._id },
      { $set: prof },
      { upsert: true }
    );
    await db.collection('professions').updateOne(
      { _id: prof._id },
      { $set: prof },
      { upsert: true }
    );
  }

  console.log('Sync completed successfully!');
  await closeDatabase();
}

syncAndFixProfessions().catch(console.error);
