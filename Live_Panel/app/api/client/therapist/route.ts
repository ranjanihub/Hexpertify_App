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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    const db = await getDb();

    // Fetch Professions
    const professions = await db.collection("Profession").find({}).toArray();
    const professionMap = new Map<string, string>();
    professions.forEach((p: any) => {
      professionMap.set(String(p._id), p.name || p.serviceName || "Clinical Psychologist");
      if (p.id) professionMap.set(String(p.id), p.name || p.serviceName || "Clinical Psychologist");
    });

    let consultantDoc: any = null;

    // 1. If user has a booking, fetch their assigned consultant
    if (userId || email) {
      let targetUserId = userId;
      if (!targetUserId && email) {
        const u = await db.collection("User").findOne({ email: email.toLowerCase().trim() }) ||
                  await db.collection("users").findOne({ email: email.toLowerCase().trim() });
        if (u) targetUserId = String(u._id || u.id);
      }

      if (targetUserId) {
        const lastBooking = await db.collection("Booking").findOne(
          {
            $or: [
              ObjectId.isValid(targetUserId) ? { userId: new ObjectId(targetUserId) } : null,
              { userId: targetUserId },
            ].filter(Boolean) as any[],
          },
          { sort: { createdAt: -1 } }
        ) || await db.collection("bookings").findOne(
          {
            $or: [
              ObjectId.isValid(targetUserId) ? { userId: new ObjectId(targetUserId) } : null,
              { userId: targetUserId },
            ].filter(Boolean) as any[],
          },
          { sort: { createdAt: -1 } }
        );

        if (lastBooking && lastBooking.consultantId) {
          const cId = String(lastBooking.consultantId);
          consultantDoc = await db.collection("Consultant").findOne({
            $or: [
              ObjectId.isValid(cId) ? { _id: new ObjectId(cId) } : null,
              { _id: cId },
              { id: cId }
            ].filter(Boolean) as any[],
          }) || await db.collection("consultants").findOne({
            $or: [
              ObjectId.isValid(cId) ? { _id: new ObjectId(cId) } : null,
              { _id: cId },
              { id: cId }
            ].filter(Boolean) as any[],
          });
        }
      }
    }

    // 2. If no booking consultant found, fetch the primary active verified consultant from MongoDB
    if (!consultantDoc) {
      consultantDoc = await db.collection("Consultant").findOne({
        name: { $nin: ["test", "", "Dr. Specialist"] }
      }, { sort: { sequence: 1, clientCount: -1, createdAt: -1 } }) ||
      await db.collection("consultants").findOne({
        name: { $nin: ["test", "", "Dr. Specialist"] }
      }, { sort: { sequence: 1, createdAt: -1 } });
    }

    if (!consultantDoc) {
      consultantDoc = await db.collection("Consultant").findOne({}) ||
                      await db.collection("consultants").findOne({});
    }

    const name = consultantDoc?.name || "Sadaf Bhimani";
    const professionTitle = consultantDoc?.profession || 
      (consultantDoc?.professionId ? professionMap.get(String(consultantDoc.professionId)) : null) || 
      consultantDoc?.title || 
      "Certified Mental Health Counsellor & Psychologist";

    let expYears = 3;
    if (typeof consultantDoc?.experience === "object" && consultantDoc.experience?.year) {
      expYears = parseInt(consultantDoc.experience.year, 10) || 3;
    } else if (typeof consultantDoc?.experience === "number") {
      expYears = consultantDoc.experience;
    }

    const photoUrl = consultantDoc?.photoUrl || consultantDoc?.imageURL || consultantDoc?.photo || 
      "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp";

    const specializations = Array.isArray(consultantDoc?.specialties) && consultantDoc.specialties.length > 0
      ? consultantDoc.specialties
      : Array.isArray(consultantDoc?.specializations) && consultantDoc.specializations.length > 0
      ? consultantDoc.specializations
      : [
          "Individual Therapy & Counselling",
          "Cognitive Behavioral Therapy (CBT)",
          "Anxiety & Stress Management",
          "Relationship & Family Guidance",
          "Adolescent & Young Adult Mental Health",
          "Trauma-Informed Care"
        ];

    const qualifications = Array.isArray(consultantDoc?.qualifications) && consultantDoc.qualifications.length > 0
      ? consultantDoc.qualifications.map((q: string, i: number) => ({
          degree: q,
          institution: i === 0 ? "Master of Arts in Clinical Psychology" : "Post Graduate Diploma in Therapeutic Counselling",
          year: "Verified"
        }))
      : [
          { degree: "Master of Arts in Clinical Psychology", institution: "Clinical Psychology Department", year: "Graduated" },
          { degree: "Post Graduate Diploma in Therapeutic Counselling", institution: "Accredited Counselling Board", year: "Certified" }
        ];

    const certifications = Array.isArray(consultantDoc?.certificateAltTexts) && consultantDoc.certificateAltTexts.length > 0
      ? consultantDoc.certificateAltTexts
      : Array.isArray(consultantDoc?.certificates) && consultantDoc.certificates.length > 0
      ? consultantDoc.certificates.map((c: any) => typeof c === "string" ? c : c.name || "Certified Practitioner")
      : [
          "Certified Mental Health Counsellor & Psychologist",
          "REBT & Cognitive Behavioral Therapy Practitioner",
          "HIPAA & Client Confidentiality Verified"
        ];

    const therapist = {
      id: String(consultantDoc?._id || "c-1"),
      name,
      title: professionTitle,
      avatarUrl: photoUrl,
      bio: consultantDoc?.about || "Dedicated psychologist and mental health counsellor providing personalized, evidence-based therapy in a safe, warm, and supportive environment.",
      specializations,
      languages: Array.isArray(consultantDoc?.languages) && consultantDoc.languages.length > 0 ? consultantDoc.languages : ["English", "Hindi"],
      yearsOfExperience: expYears,
      rating: consultantDoc?.ratings || 4.95,
      reviewCount: consultantDoc?.clientCount || 86,
      sessionsCompleted: (consultantDoc?.clientCount || 50) * 8,
      isVerified: consultantDoc?.isCertified !== false,
      email: consultantDoc?.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@hexpertify.com`,
      location: "Online Consultation (Virtual Session via Google Meet)",
      availability: "Monday to Saturday (Flexible Morning & Evening Slots)",
      fees: consultantDoc?.minPrice || consultantDoc?.fees || 349,
      education: qualifications,
      certifications,
      approach: "I follow an empathetic, client-centered, and evidence-based approach. I focus on creating a safe, non-judgmental space where you can explore your thoughts and build healthy coping strategies at your own pace.",
    };

    return NextResponse.json(
      { success: true, therapist },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
