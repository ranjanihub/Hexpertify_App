import { MongoClient } from "mongodb";
import dns from "dns";
import fs from "fs";
import path from "path";

dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const SOURCE_URI = "mongodb+srv://hexpertifybookings:LCN86tX7nBfAZXLv@cluster0.kp0ce.mongodb.net/cms?retryWrites=true&w=majority";
const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

const BACKUP_DIR = path.resolve("d:/Hexpertify_Panel/backups", `backup_${new Date().toISOString().replace(/[:.]/g, "-")}`);

async function main() {
  console.log("=================================================");
  console.log("1. STARTING DATABASE BACKUP FROM SOURCE MONGODB");
  console.log("   Source DB: hexpertifybookings / cms");
  console.log("=================================================");

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const sourceClient = new MongoClient(SOURCE_URI);
  await sourceClient.connect();
  const sourceDb = sourceClient.db("cms");

  const collections = await sourceDb.listCollections().toArray();
  console.log(`Discovered ${collections.length} collections:`, collections.map(c => c.name));

  const backupManifest = {
    sourceDatabase: "cms",
    backupTimestamp: new Date().toISOString(),
    collections: {},
  };

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith("system.")) continue;

    const sourceCollection = sourceDb.collection(colName);
    const docs = await sourceCollection.find({}).toArray();
    const indexes = await sourceCollection.indexes();

    const filePath = path.join(BACKUP_DIR, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");

    backupManifest.collections[colName] = {
      count: docs.length,
      file: `${colName}.json`,
      indexes: indexes.map(idx => idx.name),
    };

    console.log(`[BACKUP] Collection '${colName}': Saved ${docs.length} documents -> ${filePath}`);
  }

  fs.writeFileSync(path.join(BACKUP_DIR, "manifest.json"), JSON.stringify(backupManifest, null, 2), "utf8");
  console.log(`\nBackup successfully written to: ${BACKUP_DIR}`);

  console.log("\n=================================================");
  console.log("2. RESTORING & SETTING UP IN TARGET MONGODB");
  console.log("   Target DB: ranjaniranjani5694 / hexpertify");
  console.log("=================================================");

  const targetClient = new MongoClient(TARGET_URI);
  await targetClient.connect();
  const targetDb = targetClient.db("hexpertify");

  for (const [colName, info] of Object.entries(backupManifest.collections)) {
    const filePath = path.join(BACKUP_DIR, `${colName}.json`);
    const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const targetCollection = targetDb.collection(colName);

    console.log(`[RESTORE] Setting up '${colName}' (${docs.length} documents)...`);
    for (const doc of docs) {
      await targetCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
    }
  }

  console.log("\n=================================================");
  console.log("3. FINAL VERIFICATION IN TARGET DATABASE");
  console.log("=================================================");
  const targetCollections = await targetDb.listCollections().toArray();
  for (const col of targetCollections) {
    const count = await targetDb.collection(col.name).countDocuments();
    console.log(`Target Collection '${col.name}': ${count} documents`);
  }

  await sourceClient.close();
  await targetClient.close();
  console.log("\nFULL BACKUP AND SETUP SUCCESSFULLY COMPLETED!");
}

main().catch((err) => {
  console.error("Backup & setup error:", err);
  process.exit(1);
});
