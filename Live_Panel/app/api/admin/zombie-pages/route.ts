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

// 1. GET ALL ZOMBIE PAGES (100% Dynamic from MongoDB Atlas collection: zombie_pages)
export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection("zombie_pages");

    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();

    const zombiePages = docs.map((d: any) => ({
      id: d.id || String(d._id),
      pageTitle: d.pageTitle || "",
      slug: d.slug || "",
      targetUrl: d.targetUrl || "",
      htmlChunk: d.htmlChunk || "",
      seo: d.seo || {
        metaTitle: d.pageTitle || "",
        metaDescription: "",
        keywords: "",
        canonicalUrl: d.targetUrl || "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: "",
        ogImageAltText: "",
        structuredData: ""
      },
      status: d.status || "Draft",
      createdAt: d.createdAt ? (typeof d.createdAt === "string" ? d.createdAt : new Date(d.createdAt).toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
      updatedAt: d.updatedAt ? (typeof d.updatedAt === "string" ? d.updatedAt : new Date(d.updatedAt).toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
      viewsCount: typeof d.viewsCount === "number" ? d.viewsCount : 0
    }));

    return NextResponse.json(
      { success: true, count: zombiePages.length, zombiePages },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, zombiePages: [] },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

function buildIdFilter(id: string): any {
  const filters: any[] = [{ id }, { _id: id }];
  if (ObjectId.isValid(id) && id.length === 24) {
    try {
      filters.push({ _id: new ObjectId(id) });
    } catch {}
  }
  return { $or: filters };
}

// 2. CREATE NEW ZOMBIE PAGE
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("zombie_pages");
    const body = await req.json();

    const newId = body.id || `ZMB-${new ObjectId().toString().slice(-6).toUpperCase()}`;
    const today = new Date().toISOString().split("T")[0];

    const cleanSlug = body.slug ? (body.slug.startsWith("/") ? body.slug : `/${body.slug}`) : "";

    const newDoc: any = {
      _id: newId,
      id: newId,
      pageTitle: body.pageTitle || "",
      slug: cleanSlug,
      targetUrl: body.targetUrl || cleanSlug,
      htmlChunk: body.htmlChunk || "",
      seo: body.seo || {
        metaTitle: body.pageTitle || "",
        metaDescription: "",
        keywords: "",
        canonicalUrl: body.targetUrl || "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: "",
        ogImageAltText: "",
        structuredData: ""
      },
      status: body.status || "Draft",
      createdAt: body.createdAt || today,
      updatedAt: today,
      viewsCount: body.viewsCount || 0,
    };

    await collection.replaceOne({ _id: newId } as any, newDoc, { upsert: true });

    return NextResponse.json(
      { success: true, message: "Zombie Page saved in DB collection zombie_pages", zombiePage: newDoc },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 3. UPDATE EXISTING ZOMBIE PAGE
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("zombie_pages");
    const body = await req.json();

    const id = body.id || body._id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing page id" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const updateFields: any = {
      updatedAt: today,
    };

    if (body.pageTitle !== undefined) updateFields.pageTitle = body.pageTitle;
    if (body.slug !== undefined) updateFields.slug = body.slug.startsWith("/") ? body.slug : `/${body.slug}`;
    if (body.targetUrl !== undefined) updateFields.targetUrl = body.targetUrl;
    if (body.htmlChunk !== undefined) updateFields.htmlChunk = body.htmlChunk;
    if (body.seo !== undefined) updateFields.seo = body.seo;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.viewsCount !== undefined) updateFields.viewsCount = body.viewsCount;

    await collection.updateOne(
      buildIdFilter(id),
      { $set: updateFields }
    );

    const updated = await collection.findOne(buildIdFilter(id));

    return NextResponse.json(
      { success: true, message: "Zombie page updated in DB", zombiePage: updated },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 4. DELETE ZOMBIE PAGE
export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("zombie_pages");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id parameter" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    await collection.deleteOne(buildIdFilter(id));

    return NextResponse.json(
      { success: true, message: `Zombie page ${id} deleted from collection zombie_pages` },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

