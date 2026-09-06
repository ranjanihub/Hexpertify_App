import { MongoClient } from "mongodb";
import dns from "dns";

// Use public DNS to reliably resolve MongoDB SRV records on Windows
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const SOURCE_URI = "mongodb+srv://hexpertifybookings:LCN86tX7nBfAZXLv@cluster0.kp0ce.mongodb.net/cms?retryWrites=true&w=majority";
const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function runMigration() {
  console.log("Connecting to Source Database (hexpertifybookings/cms)...");
  const sourceClient = new MongoClient(SOURCE_URI);
  await sourceClient.connect();
  const sourceDb = sourceClient.db("cms");

  console.log("Connecting to Target Database (ranjaniranjani5694/hexpertify)...");
  const targetClient = new MongoClient(TARGET_URI);
  await targetClient.connect();
  const targetDb = targetClient.db("hexpertify");

  const collections = await sourceDb.listCollections().toArray();
  console.log(`Found ${collections.length} collections in Source DB:`, collections.map(c => c.name));

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith("system.")) continue;

    console.log(`\n--- Migrating collection: ${colName} ---`);
    const sourceCollection = sourceDb.collection(colName);
    const targetCollection = targetDb.collection(colName);

    const docs = await sourceCollection.find({}).toArray();
    console.log(`Source count for '${colName}': ${docs.length}`);

    if (docs.length > 0) {
      for (const doc of docs) {
        // Upsert each document by _id to preserve identity without duplicating
        await targetCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
      }
      console.log(`Successfully migrated ${docs.length} documents into '${colName}' in Target DB.`);
    } else {
      console.log(`Collection '${colName}' is empty, skipping document copy.`);
    }
  }

  console.log("\n==========================================");
  console.log("ALL DATA HAS BEEN SUCCESSFULLY TRANSFERRED!");
  console.log("==========================================");

  // Print target database summary
  const targetCollections = await targetDb.listCollections().toArray();
  for (const col of targetCollections) {
    const count = await targetDb.collection(col.name).countDocuments();
    console.log(`Target Collection '${col.name}': ${count} documents`);
  }

  await sourceClient.close();
  await targetClient.close();
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
