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

    // Fetch Professions Map
    const professions = await db.collection("Profession").find({}).toArray();
    const professionMap = new Map<string, string>();
    professions.forEach((p: any) => {
      professionMap.set(String(p._id), p.name || p.serviceName || "Clinical Psychologist");
      if (p.id) professionMap.set(String(p.id), p.name || p.serviceName || "Clinical Psychologist");
    });

    const [rawConsRich, rawConsCms] = await Promise.all([
      db.collection("Consultant").find({}).sort({ sequence: 1, createdAt: -1 }).toArray(),
      db.collection("consultants").find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const seenNames = new Set();
    const allConsultants: any[] = [];

    for (const c of [...rawConsRich, ...rawConsCms]) {
      const name = (c.name || "").trim() || "Consultant Specialist";
      const consKey = (c.email || c.identifier || name).toLowerCase().trim();
      if (seenNames.has(consKey)) continue;
      seenNames.add(consKey);

      let expYears = 4;
      if (typeof c.experience === "object" && c.experience?.year) {
        expYears = parseInt(c.experience.year, 10) || 4;
      } else if (typeof c.experience === "number") {
        expYears = c.experience;
      }

      const profName = c.profession || professionMap.get(String(c.professionId)) || c.title || "Counselling Psychologist";
      const photo = c.photoUrl || c.imageURL || c.photo || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80";

      allConsultants.push({
        id: String(c._id),
        name,
        email: c.email || `${(c.identifier || name).toLowerCase().replace(/[^a-z0-9]/g, ".")}@hexpertify.com`,
        identifier: c.identifier || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sequence: c.sequence || 999,
        notificationTitle: c.notificationTitle || null,
        profession: profName,
        title: profName,
        photo,
        photoUrl: photo,
        photoAltText: c.photoAltText || `certified therapist ${name.toLowerCase()}`,
        youtubeUrl: c.youtubeUrl || "",
        experience: expYears,
        experienceYears: expYears,
        fees: c.minPrice || c.fees || 998,
        minPrice: c.minPrice || c.fees || 998,
        platformFeePerSession: c.minPrice || c.fees || 500,
        ratings: c.ratings || 4.9,
        rating: c.ratings || 4.9,
        reviewCount: Array.isArray(c.reviews) ? c.reviews.length : 12,
        activeClientsCount: c.clientCount || 12,
        clientsServed: c.clientCount || 50,
        languages: Array.isArray(c.languages) && c.languages.length > 0 ? c.languages : ["Tamil", "English"],
        specializations: Array.isArray(c.specialties) && c.specialties.length > 0 ? c.specialties : ["Individual counselling", "Couple therapy", "Family counselling"],
        qualifications: Array.isArray(c.qualifications) && c.qualifications.length > 0 ? c.qualifications : ["Master of Science in Counselling Psychology"],
        certificates: Array.isArray(c.certificateUrls) 
          ? c.certificateUrls.map((url: string, i: number) => ({ name: c.certificateAltTexts?.[i] || "Certified Practitioner Certificate", url }))
          : [],
        about: c.about || "Experienced clinical psychologist providing evidence-based psychotherapy, counseling, and mental health care.",
        bio: c.about || "Experienced clinical psychologist providing evidence-based psychotherapy, counseling, and mental health care.",
        isCertified: c.isCertified !== false,
        verificationStatus: "Verified",
        accountStatus: "Active",
        licenseNumber: `LIC-${String(c._id).slice(0, 6).toUpperCase()}`,
        faqs: Array.isArray(c.faqs) ? c.faqs : [],
        services: Array.isArray(c.services) ? c.services : [
          {
            id: `SRV-${String(c._id).slice(0, 6)}`,
            serviceName: "Individual Therapy Consultation",
            durationMinutes: 50,
            sessionFee: c.minPrice || 998,
            platformFee: 200,
            description: "One-on-one personalized clinical counseling session."
          }
        ],
        outcomes: {
          clientImprovementScore: 95,
          goalAchievementRate: 90,
          homeworkAdherenceRate: 88,
          attendanceRate: 96
        }
      });
    }

    return NextResponse.json(
      { success: true, count: allConsultants.length, consultants: allConsultants },
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
      name: body.name,
      email: body.email,
      identifier: body.identifier || (body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      sequence: parseInt(body.sequence, 10) || 999,
      notificationTitle: body.notificationTitle || null,
      profession: body.profession || "Counselling Psychologist",
      photoUrl: body.photo || body.photoUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      photoAltText: body.photoAltText || `certified therapist ${body.name}`,
      youtubeUrl: body.youtubeUrl || "",
      experience: parseInt(body.experienceYears, 10) || 4,
      clientCount: parseInt(body.clientsServed, 10) || 0,
      isCertified: Boolean(body.isCertified),
      minPrice: parseInt(body.platformFeePerSession, 10) || 998,
      languages: body.languages || ["Tamil", "English"],
      specialties: body.specialties || body.specializations || ["Individual counselling", "Couple therapy"],
      qualifications: body.qualifications || ["Master of Science in Family Counseling"],
      certificateUrls: Array.isArray(body.certificates) ? body.certificates.map((c: any) => typeof c === 'string' ? c : c.url) : [],
      certificateAltTexts: Array.isArray(body.certificates) ? body.certificates.map((c: any) => typeof c === 'string' ? c : c.name) : [],
      about: body.about || body.bio || "",
      faqs: body.faqs || [],
      services: body.services || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("Consultant").insertOne(doc);

    return NextResponse.json(
      { success: true, message: "Consultant created successfully in MongoDB", consultant: { ...doc, id: newId } },
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
    const id = body.id || body._id;

    if (!id) {
      return NextResponse.json({ success: false, error: "Consultant ID is required for update" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }] };

    const updateDoc: any = {
      $set: {
        name: body.name,
        email: body.email,
        identifier: body.identifier,
        sequence: parseInt(body.sequence, 10) || undefined,
        notificationTitle: body.notificationTitle,
        profession: body.profession,
        photoUrl: body.photo || body.photoUrl || undefined,
        photoAltText: body.photoAltText,
        youtubeUrl: body.youtubeUrl,
        experience: parseInt(body.experienceYears, 10) || undefined,
        clientCount: parseInt(body.clientsServed, 10) || undefined,
        isCertified: body.isCertified !== undefined ? Boolean(body.isCertified) : undefined,
        minPrice: parseInt(body.platformFeePerSession, 10) || undefined,
        languages: body.languages,
        specialties: body.specialties || body.specializations,
        qualifications: body.qualifications,
        certificateUrls: Array.isArray(body.certificates) ? body.certificates.map((c: any) => typeof c === 'string' ? c : c.url) : undefined,
        certificateAltTexts: Array.isArray(body.certificates) ? body.certificates.map((c: any) => typeof c === 'string' ? c : c.name) : undefined,
        about: body.about || body.bio,
        faqs: body.faqs,
        services: body.services,
        updatedAt: new Date()
      }
    };

    await db.collection("Consultant").updateOne(query, updateDoc);

    return NextResponse.json(
      { success: true, message: "Consultant updated successfully in MongoDB" },
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

    const query = { $or: [{ _id: id }, { id }] };
    await db.collection("Consultant").deleteOne(query);

    return NextResponse.json(
      { success: true, message: "Consultant deleted successfully from MongoDB" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
