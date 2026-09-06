import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";
const DIRECT_URI = "mongodb://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@ac-n5nn3cx-shard-00-00.ibhuunq.mongodb.net:27017,ac-n5nn3cx-shard-00-01.ibhuunq.mongodb.net:27017,ac-n5nn3cx-shard-00-02.ibhuunq.mongodb.net:27017/hexpertify?ssl=true&replicaSet=atlas-27s45j-shard-0&authSource=admin&retryWrites=true&w=majority";

let client: MongoClient | null = null;
async function getDb() {
  if (client) return client.db("hexpertify");
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    client = new MongoClient(TARGET_URI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    await client.connect();
    return client.db("hexpertify");
  } catch {
    client = new MongoClient(DIRECT_URI, { connectTimeoutMS: 8000, serverSelectionTimeoutMS: 8000 });
    await client.connect();
    return client.db("hexpertify");
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// 1. GET Homepage CMS Data
export async function GET() {
  try {
    const db = await getDb();

    let page = await db.collection("Page").findOne({
      $or: [{ identifier: "home" }, { slug: "home" }, { slug: "home-page" }, { identifier: "home-page" }]
    });

    if (!page) {
      page = await db.collection("Page").findOne({});
    }

    let seoMeta: any = null;
    if (page?.seoMetaId) {
      seoMeta = await db.collection("SeoMeta").findOne({
        $or: [
          { _id: page.seoMetaId },
          { id: page.seoMetaId },
          ...(ObjectId.isValid(page.seoMetaId) ? [{ _id: new ObjectId(page.seoMetaId) }] : [])
        ]
      });
    }

    // Format carousel images
    const carouselImages = (page?.carouselImageUrls || []).map((url: string, idx: number) => ({
      id: `CAR-${idx + 1}`,
      imageUrl: url,
      altText: page?.carouselImageAltTexts?.[idx] || "",
      deviceType: url.includes("mobile") || idx % 2 === 1 ? "Mobile" : "Desktop"
    }));

    // Format FAQs
    const faqs = (page?.faqs || []).map((f: any, idx: number) => ({
      id: f.id || `FAQ-${idx + 1}`,
      question: f.question || "",
      answer: f.answer || ""
    }));

    // Format Testimonials
    const testimonials = (page?.testimonials || []).map((t: any, idx: number) => ({
      id: t.id || `TEST-${idx + 1}`,
      authorName: t.authorName || "",
      profession: t.authorProfessional || t.profession || "",
      authorEmail: t.authorEmail || "",
      authorImageUrl: t.authorImageUrl || "",
      authorImageAltText: t.authorImageAltText || "",
      content: t.quote || t.content || ""
    }));

    // Keywords string
    const rawKeywords = seoMeta?.metaKeywords || [];
    const keywordsStr = Array.isArray(rawKeywords) ? rawKeywords.join(", ") : String(rawKeywords || "");

    const responseData = {
      general: {
        pageIdentifier: page?.identifier || "home",
        notificationTitle: page?.notificationTitle || ""
      },
      carouselImages: carouselImages,
      seo: {
        metaTitle: seoMeta?.metaTitle || "",
        metaDescription: seoMeta?.metaDescription || "",
        keywords: keywordsStr,
        openGraphTitle: seoMeta?.ogTitle || seoMeta?.metaTitle || "",
        openGraphDescription: seoMeta?.ogDescription || seoMeta?.metaDescription || "",
        openGraphImageUrl: seoMeta?.ogImageUrl || "",
        openGraphImageAltText: seoMeta?.ogImageAltText || ""
      },
      faqs: faqs,
      testimonials: testimonials
    };

    return NextResponse.json(
      { success: true, cms: responseData },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 2. SAVE (PUT) Homepage CMS Data
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();

    let page = await db.collection("Page").findOne({
      $or: [{ identifier: "home" }, { slug: "home" }, { slug: "home-page" }, { identifier: "home-page" }]
    });

    const carouselImageUrls = (body.carouselImages || []).map((c: any) => c.imageUrl);
    const carouselImageAltTexts = (body.carouselImages || []).map((c: any) => c.altText || "Banner image");

    const faqs = (body.faqs || []).map((f: any) => ({
      question: f.question,
      answer: f.answer
    }));

    const testimonials = (body.testimonials || []).map((t: any) => ({
      quote: t.content,
      authorName: t.authorName,
      authorProfessional: t.profession,
      authorImageUrl: t.authorImageUrl,
      authorEmail: t.authorEmail,
      authorImageAltText: t.authorImageAltText
    }));

    let seoMetaId = page?.seoMetaId;

    if (body.seo) {
      const keywordsArray = typeof body.seo.keywords === "string"
        ? body.seo.keywords.split(",").map((s: string) => s.trim()).filter(Boolean)
        : body.seo.keywords || [];

      const seoDoc: any = {
        metaTitle: body.seo.metaTitle,
        metaDescription: body.seo.metaDescription,
        metaKeywords: keywordsArray,
        ogTitle: body.seo.openGraphTitle,
        ogDescription: body.seo.openGraphDescription,
        ogImageUrl: body.seo.openGraphImageUrl,
        ogImageAltText: body.seo.openGraphImageAltText,
        updatedAt: new Date()
      };

      if (seoMetaId) {
        await db.collection("SeoMeta").updateOne(
          { $or: [{ _id: seoMetaId }, { id: seoMetaId }, ...(ObjectId.isValid(seoMetaId) ? [{ _id: new ObjectId(seoMetaId) }] : [])] },
          { $set: seoDoc }
        );
      } else {
        seoMetaId = new ObjectId().toString();
        await db.collection("SeoMeta").insertOne({
          _id: seoMetaId,
          ...seoDoc,
          createdAt: new Date()
        });
      }
    }

    const pageIdentifier = body.general?.pageIdentifier || body.pageSlug || "home";
    const notificationTitle = body.general?.notificationTitle || body.notificationTitle || "Welcome to Hexpertify";

    const pageUpdate: any = {
      identifier: pageIdentifier,
      notificationTitle,
      carouselImageUrls,
      carouselImageAltTexts,
      faqs,
      testimonials,
      seoMetaId,
      updatedAt: new Date()
    };

    if (page) {
      await db.collection("Page").updateOne({ _id: page._id }, { $set: pageUpdate });
    } else {
      const newPageId = new ObjectId().toString();
      await db.collection("Page").insertOne({
        _id: newPageId,
        ...pageUpdate,
        createdAt: new Date()
      });
    }

    return NextResponse.json(
      { success: true, message: "Homepage CMS data saved successfully to MongoDB Atlas!" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
