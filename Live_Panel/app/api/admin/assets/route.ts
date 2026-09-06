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

    const [assetsHex, assetsDev] = await Promise.all([
      db.collection("Asset").find({}).sort({ createdAt: -1 }).toArray(),
      client!.db("hexpertifyDev").collection("Asset").find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const seenUrls = new Set();
    const allAssets: any[] = [];

    const formatCategory = (cat: string) => {
      const c = (cat || "").toUpperCase();
      if (c === "BANNER") return "Banner";
      if (c === "CONSULTANT") return "Consultant";
      if (c === "ICON") return "Icon";
      if (c === "PROFESSIONAL") return "Professional";
      if (c === "CLIENT") return "Client";
      if (c === "CERTIFICATE") return "Certificate";
      if (c === "BLOG") return "Blog";
      if (c === "PDF") return "PDF File";
      if (c === "VIDEO") return "Video";
      if (c === "AUDIO") return "Audio";
      return "Other";
    };

    for (const a of [...assetsHex, ...assetsDev]) {
      const url = a.url || "";
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const category = formatCategory(a.category);
      const isImg = url.match(/\.(webp|png|jpg|jpeg|svg|gif)($|\?)/i) || url.includes("cloudinary.com");

      allAssets.push({
        id: String(a._id),
        name: a.name || "Asset Resource",
        type: category,
        category,
        url,
        publicId: a.publicId || "",
        size: a.size || "1.2 MB",
        uploadedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Dec 27, 2025",
        createdAt: a.createdAt || new Date(),
        isImage: Boolean(isImg)
      });
    }

    return NextResponse.json(
      { success: true, count: allAssets.length, assets: allAssets },
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

    const doc = {
      _id: newId,
      name: body.name || "Uploaded Platform Asset",
      category: String(body.category || body.type || "BANNER").toUpperCase(),
      url: body.url || "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766863367/uploads/t2lxakaiyjokggczle5l.webp",
      publicId: body.publicId || `uploads/${newId.slice(0, 10)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("Asset").insertOne(doc);

    return NextResponse.json(
      { success: true, message: "Asset created successfully in MongoDB", asset: { ...doc, id: newId } },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 3. DELETE (DELETE)
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

    const result = await db.collection("Asset").deleteOne({ $or: queries });

    return NextResponse.json(
      { success: true, message: "Asset deleted successfully from MongoDB Atlas", deletedCount: result.deletedCount },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
