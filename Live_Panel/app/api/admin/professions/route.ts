import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

let client: MongoClient | null = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(TARGET_URI);
    await client.connect();
  }
  return client.db("hexpertify");
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

// 1. READ ALL (GET)
export async function GET() {
  try {
    const db = await getDb();

    const [professions, seoMetas, consultants] = await Promise.all([
      db.collection("Profession").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("SeoMeta").find({}).toArray(),
      db.collection("Consultant").find({}).toArray(),
    ]);

    const seoMap = new Map();
    seoMetas.forEach((s: any) => {
      seoMap.set(String(s._id), s);
      if (s.id) seoMap.set(String(s.id), s);
    });

    const formattedProfessions = professions.map((p: any) => {
      const seo = seoMap.get(String(p.seoMetaId)) || {};
      const consCount = consultants.filter((c: any) => String(c.professionId) === String(p._id) || c.profession === p.name).length;

      return {
        id: String(p._id),
        serviceName: p.name || "Specialized Consultation",
        identifier: p.identifier || (p.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        imageUrl: p.imageUrl || p.bannerUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
        imageAltText: p.imageAltText || `${p.name} category illustration`,
        bannerUrl: p.bannerUrl || p.imageUrl || "",
        bannerTitle: p.bannerTitle || `Expert ${p.name} Consultations`,
        heroBannerUrl: p.bannerUrl || p.imageUrl || "",
        heroBannerTitle: p.bannerTitle || `Expert ${p.name} Consultations`,
        faqs: Array.isArray(p.faqs) ? p.faqs : [],
        therapistsCount: consCount || 8,
        seo: {
          metaTitle: seo.metaTitle || `${p.name} | Verified Experts on Hexpertify`,
          keywords: Array.isArray(seo.metaKeywords) ? seo.metaKeywords.join(", ") : (seo.metaKeywords || p.identifier || "consulting"),
          canonicalUrl: seo.canonicalUrl || `https://hexpertify.com/consultants/${p.identifier}`,
          openGraphTitle: seo.ogTitle || seo.metaTitle || `${p.name} Consultations`,
          openGraphDescription: seo.ogDescription || seo.metaDescription || `Find verified ${p.name} specialists.`,
          openGraphImageUrl: seo.ogImage || p.imageUrl || "",
          openGraphImageAltText: seo.ogImageAlt || p.imageAltText || `${p.name} thumbnail`,
          structuredDataJson: typeof seo.structuredData === "object" ? JSON.stringify(seo.structuredData) : (seo.structuredData || ""),
          htmlChunk: seo.htmlChunk || ""
        }
      };
    });

    return NextResponse.json(
      { success: true, count: formattedProfessions.length, professions: formattedProfessions },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 2. CREATE (POST)
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();

    const newId = body.id || new ObjectId().toString();
    const newSeoId = new ObjectId().toString();

    // Insert SEO Meta
    if (body.seo) {
      await db.collection("SeoMeta").insertOne({
        _id: newSeoId,
        metaTitle: body.seo.metaTitle || body.serviceName,
        metaDescription: body.seo.metaDescription || "",
        metaKeywords: body.seo.keywords || [],
        canonicalUrl: body.seo.canonicalUrl || "",
        ogTitle: body.seo.openGraphTitle || body.seo.metaTitle,
        ogDescription: body.seo.openGraphDescription || body.seo.metaDescription,
        ogImage: body.seo.openGraphImageUrl || body.imageUrl,
        structuredData: body.seo.structuredDataJson || "",
        createdAt: new Date()
      });
    }

    // Insert Profession
    const doc = {
      _id: newId,
      name: body.serviceName,
      identifier: body.identifier || body.serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      imageUrl: body.imageUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
      imageAltText: body.imageAltText || `${body.serviceName} icon`,
      bannerUrl: body.heroBannerUrl || body.bannerUrl || body.imageUrl,
      bannerTitle: body.heroBannerTitle || body.bannerTitle || "",
      seoMetaId: newSeoId,
      faqs: body.faqs || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("Profession").insertOne(doc);

    return NextResponse.json(
      { success: true, message: "Profession created successfully", profession: { ...doc, id: newId } },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 3. UPDATE (PUT)
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { id, serviceName, identifier, imageUrl, imageAltText, heroBannerUrl, bannerUrl, heroBannerTitle, bannerTitle, faqs, seo } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Profession ID is required for update" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }] };
    const existing = await db.collection("Profession").findOne(query);

    const updateDoc: any = {
      $set: {
        name: serviceName,
        identifier: identifier || (serviceName ? serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined),
        imageUrl: imageUrl || undefined,
        imageAltText: imageAltText || undefined,
        bannerUrl: heroBannerUrl || bannerUrl || imageUrl || undefined,
        bannerTitle: heroBannerTitle || bannerTitle || undefined,
        faqs: faqs || [],
        updatedAt: new Date()
      }
    };

    await db.collection("Profession").updateOne(query, updateDoc);

    // Update SEO Meta if linked
    if (seo && existing?.seoMetaId) {
      await db.collection("SeoMeta").updateOne(
        { $or: [{ _id: existing.seoMetaId }, { id: existing.seoMetaId }] },
        {
          $set: {
            metaTitle: seo.metaTitle,
            metaDescription: seo.metaDescription,
            metaKeywords: seo.keywords,
            canonicalUrl: seo.canonicalUrl,
            ogTitle: seo.openGraphTitle || seo.metaTitle,
            ogDescription: seo.openGraphDescription || seo.metaDescription,
            ogImage: seo.openGraphImageUrl || imageUrl,
            updatedAt: new Date()
          }
        }
      );
    }

    return NextResponse.json(
      { success: true, message: "Profession updated successfully" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 4. DELETE (DELETE)
export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parameter is required" }, { status: 400 });
    }

    const queries: any[] = [{ _id: id }, { id: id }];
    if (ObjectId.isValid(id)) {
      queries.push({ _id: new ObjectId(id) });
    }

    const existing = await db.collection("Profession").findOne({ $or: queries });

    if (existing?.seoMetaId) {
      const seoQueries: any[] = [{ _id: existing.seoMetaId }, { id: existing.seoMetaId }];
      if (ObjectId.isValid(existing.seoMetaId)) {
        seoQueries.push({ _id: new ObjectId(existing.seoMetaId) });
      }
      await db.collection("SeoMeta").deleteOne({ $or: seoQueries });
    }

    const result = await db.collection("Profession").deleteOne({ $or: queries });

    return NextResponse.json(
      { success: true, message: "Profession and SEO metadata deleted successfully from MongoDB Atlas", deletedCount: result.deletedCount },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
