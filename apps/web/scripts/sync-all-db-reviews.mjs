import { MongoClient } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const db = client.db("hexpertify");

  console.log("Connected to MongoDB Atlas.");

  // Fetch all real reviews from Review collection
  const realReviews = await db.collection("Review").find({}).sort({ createdAt: -1 }).toArray();
  console.log(`Found ${realReviews.length} real reviews in 'Review' collection.`);

  const testimonials = realReviews.map((r, idx) => {
    const rawName = (r.clientName || "").trim();
    // Clean up name if masked like "k**al Sh***a" -> "Komal Sharma" or keep authentic
    const authorName = rawName || "Verified Client";
    const profession = (r.clientTitle || "").trim() || "Working Professional";
    const quote = (r.comment || "").trim();
    const authorEmail = r.authorEmail || `${authorName.toLowerCase().replace(/[^a-z0-9]/g, "") || "client"}@hexpertify.com`;
    const authorImageUrl = (r.imageUrls && r.imageUrls[0]) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorName)}`;
    const authorImageAltText = `${authorName} Testimonial`;

    return {
      id: String(r._id || `TEST-${idx + 1}`),
      authorName,
      authorProfessional: profession,
      authorEmail,
      authorImageUrl,
      authorImageAltText,
      quote
    };
  });

  // Update Page document with these exact 45 real reviews
  await db.collection("Page").updateOne(
    { identifier: "home" },
    { $set: { testimonials, updatedAt: new Date() } }
  );

  console.log(`Successfully updated Page document with all ${testimonials.length} authentic database reviews!`);
  await client.close();
}

main().catch(console.error);
