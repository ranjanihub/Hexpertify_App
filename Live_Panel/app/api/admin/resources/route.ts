import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

let client: MongoClient | null = null;
async function getDb() {
  if (client) return client.db("hexpertify");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  client = new MongoClient(TARGET_URI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
  await client.connect();
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

function buildIdFilter(id: string): any {
  const filters: any[] = [{ id }, { _id: id }];
  if (ObjectId.isValid(id) && id.length === 24) {
    try {
      filters.push({ _id: new ObjectId(id) });
    } catch {}
  }
  return { $or: filters };
}

// 1. GET ALL RESOURCES (100% Dynamic from MongoDB Atlas)
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("Resource");
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const docs = await collection.find({}).sort({ isRecommended: -1, createdAt: -1 }).toArray();

    let resources = docs.map((d: any) => ({
      id: d.id || String(d._id),
      type: d.type || "article",
      typeLabel: d.typeLabel || (d.type ? d.type.toUpperCase() : "ARTICLE"),
      category: d.category || "Articles",
      isRecommended: Boolean(d.isRecommended),
      isSaved: Boolean(d.isSaved),
      title: d.title || "",
      description: d.description || "",
      fullContent: d.fullContent || d.description || "",
      duration: d.duration || "",
      imageUrl: d.imageUrl || "",
      tags: Array.isArray(d.tags) ? d.tags : [],
      createdAt: d.createdAt || new Date().toISOString().split("T")[0]
    }));

    if (category && category !== "All Resources" && category !== "all") {
      resources = resources.filter(
        (r) => r.category.toLowerCase() === category.toLowerCase() || r.type.toLowerCase() === category.toLowerCase()
      );
    }

    return NextResponse.json(
      { success: true, count: resources.length, resources },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, resources: [] },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 2. CREATE NEW RESOURCE
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("Resource");
    const body = await req.json();

    const newId = body.id || `res-${new ObjectId().toString().slice(-6)}`;
    const today = new Date().toISOString().split("T")[0];

    const newDoc: any = {
      _id: newId,
      id: newId,
      type: body.type || "article",
      typeLabel: body.typeLabel || (body.type ? body.type.toUpperCase() : "ARTICLE"),
      category: body.category || "Articles",
      isRecommended: Boolean(body.isRecommended),
      isSaved: Boolean(body.isSaved),
      title: body.title || "",
      description: body.description || "",
      fullContent: body.fullContent || body.description || "",
      duration: body.duration || "5 min read",
      imageUrl: body.imageUrl || "",
      tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === "string" ? body.tags.split(",").map((s: string) => s.trim()) : []),
      createdAt: body.createdAt || today,
      updatedAt: today
    };

    await collection.replaceOne({ _id: newId } as any, newDoc, { upsert: true });

    return NextResponse.json(
      { success: true, message: "Resource saved in MongoDB Atlas collection Resource", resource: newDoc },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 3. UPDATE EXISTING RESOURCE (Bookmark Toggle or Edit)
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("Resource");
    const body = await req.json();

    const id = body.id || body._id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing resource id" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const updateFields: any = {
      updatedAt: today
    };

    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.fullContent !== undefined) updateFields.fullContent = body.fullContent;
    if (body.duration !== undefined) updateFields.duration = body.duration;
    if (body.imageUrl !== undefined) updateFields.imageUrl = body.imageUrl;
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.typeLabel !== undefined) updateFields.typeLabel = body.typeLabel;
    if (body.category !== undefined) updateFields.category = body.category;
    if (body.isRecommended !== undefined) updateFields.isRecommended = Boolean(body.isRecommended);
    if (body.isSaved !== undefined) updateFields.isSaved = Boolean(body.isSaved);
    if (body.tags !== undefined) {
      updateFields.tags = Array.isArray(body.tags) ? body.tags : body.tags.split(",").map((s: string) => s.trim());
    }

    await collection.updateOne(buildIdFilter(id), { $set: updateFields });
    const updated = await collection.findOne(buildIdFilter(id));

    return NextResponse.json(
      { success: true, message: "Resource updated in MongoDB Atlas", resource: updated },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 4. DELETE RESOURCE
export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const collection = db.collection("Resource");
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
      { success: true, message: `Resource ${id} deleted from collection Resource` },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
