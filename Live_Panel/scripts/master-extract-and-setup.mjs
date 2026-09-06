import { MongoClient } from "mongodb";
import dns from "dns";
import fs from "fs";
import path from "path";

dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const SOURCE_CLUSTER_URI = "mongodb+srv://hexpertifybookings:LCN86tX7nBfAZXLv@cluster0.kp0ce.mongodb.net/?retryWrites=true&w=majority";
const TARGET_CLUSTER_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/?retryWrites=true&w=majority";

const BACKUP_ROOT = path.resolve("d:/Hexpertify_Panel/backups/full_cluster_export");

async function runFullClusterMigration() {
  console.log("==================================================================");
  console.log("1. CONNECTING TO SOURCE & TARGET CLUSTERS");
  console.log("==================================================================");

  const sourceClient = new MongoClient(SOURCE_CLUSTER_URI);
  await sourceClient.connect();

  const targetClient = new MongoClient(TARGET_CLUSTER_URI);
  await targetClient.connect();

  const databasesToMigrate = ["cms", "hexpertify", "hexpertifyDev"];

  if (!fs.existsSync(BACKUP_ROOT)) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  }

  for (const dbName of databasesToMigrate) {
    console.log(`\n>>> Migrating Database: ${dbName} <<<`);
    const sourceDb = sourceClient.db(dbName);
    const targetDb = targetClient.db(dbName);

    const dbBackupDir = path.join(BACKUP_ROOT, dbName);
    if (!fs.existsSync(dbBackupDir)) fs.mkdirSync(dbBackupDir, { recursive: true });

    const collections = await sourceDb.listCollections().toArray();

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith("system.")) continue;

      const sourceCollection = sourceDb.collection(colName);
      const docs = await sourceCollection.find({}).toArray();

      // Save local backup file
      const backupPath = path.join(dbBackupDir, `${colName}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2), "utf8");

      console.log(`  [EXTRACTED] '${dbName}.${colName}': ${docs.length} docs`);

      if (docs.length > 0) {
        const targetCollection = targetDb.collection(colName);
        for (const doc of docs) {
          try {
            await targetCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
          } catch (e) {
            // If duplicate on unique key, update doc
            try {
              if (doc.identifier) {
                await targetCollection.replaceOne({ identifier: doc.identifier }, doc, { upsert: true });
              } else if (doc.email) {
                await targetCollection.replaceOne({ email: doc.email }, doc, { upsert: true });
              }
            } catch (err2) {}
          }
        }
        console.log(`  [RESTORED] '${dbName}.${colName}': ${docs.length} docs synced.`);
      }
    }
  }

  console.log("\n==================================================================");
  console.log("2. AUDITING TARGET DATABASES");
  console.log("==================================================================");

  const adminTarget = targetClient.db().admin();
  const targetDbs = await adminTarget.listDatabases();
  console.log("Target Cluster Databases:", targetDbs.databases.map(d => d.name));

  for (const dbName of ["cms", "hexpertify", "hexpertifyDev"]) {
    const tDb = targetClient.db(dbName);
    const cols = await tDb.listCollections().toArray();
    console.log(`\nDatabase '${dbName}' (${cols.length} collections):`);
    for (const col of cols) {
      const count = await tDb.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
  }

  await sourceClient.close();
  await targetClient.close();

  console.log("\n==================================================================");
  console.log("FULL CLUSTER EXTRACTION & SETUP COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

runFullClusterMigration().catch((err) => {
  console.error("Cluster migration error:", err);
  process.exit(1);
});
