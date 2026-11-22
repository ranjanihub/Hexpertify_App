import { MongoClient } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const db = client.db("hexpertify");

  const assets = await db.collection("Asset").find({}).limit(15).toArray();
  console.log("Real Assets in MongoDB:", assets.map(a => ({ id: a._id, name: a.name || a.title, url: a.url || a.imageUrl, alt: a.altText })));

  const reviews = await db.collection("Review").find({}).limit(10).toArray();
  console.log("Real Reviews in MongoDB:", JSON.stringify(reviews, null, 2));

  const page = await db.collection("Page").findOne({ identifier: "home" });
  console.log("Current Page doc:", JSON.stringify(page, null, 2));

  await client.close();
}

main().catch(console.error);
