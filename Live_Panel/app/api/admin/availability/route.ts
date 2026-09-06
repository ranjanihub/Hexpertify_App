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

// 1. GET ALL SLOTS (or by therapistId)
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const therapistId = searchParams.get("therapistId");

    const query: any = {};
    if (therapistId) {
      query.$or = [{ therapistId }, { consultantId: therapistId }];
    }

    const slots = await db.collection("Slot").find(query).toArray();

    return NextResponse.json(
      {
        success: true,
        count: slots.length,
        slots: slots.map((s) => ({
          ...s,
          id: String(s._id)
        }))
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 2. CREATE (POST) Single or Batch Slots
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();

    if (Array.isArray(body.slots)) {
      const docs = body.slots.map((s: any) => ({
        ...s,
        _id: s.id || new ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.collection("Slot").insertMany(docs);

      return NextResponse.json(
        { success: true, message: `${docs.length} slots created successfully in MongoDB Atlas`, count: docs.length },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const newId = body.id || new ObjectId().toString();
    const doc = {
      ...body,
      _id: newId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("Slot").insertOne(doc);

    return NextResponse.json(
      { success: true, message: "Slot created successfully in MongoDB Atlas", slot: { ...doc, id: newId } },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 3. UPDATE (PUT) Slot
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();
    const id = body.id || body._id;

    if (!id) {
      return NextResponse.json({ success: false, error: "Slot ID is required" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])] };

    const updateDoc: any = {
      $set: {
        ...body,
        updatedAt: new Date()
      }
    };
    delete updateDoc.$set._id;
    delete updateDoc.$set.id;

    await db.collection("Slot").updateOne(query, updateDoc);

    return NextResponse.json(
      { success: true, message: "Slot updated successfully in MongoDB Atlas" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 4. DELETE (DELETE) Slot
export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const therapistId = searchParams.get("therapistId");

    if (therapistId && searchParams.get("clearAll") === "true") {
      await db.collection("Slot").deleteMany({
        $or: [{ therapistId }, { consultantId: therapistId }]
      });
      return NextResponse.json(
        { success: true, message: "All slots cleared for consultant in MongoDB Atlas" },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Slot ID is required" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])] };
    await db.collection("Slot").deleteOne(query);

    return NextResponse.json(
      { success: true, message: "Slot deleted successfully from MongoDB Atlas" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
