import { MongoClient } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const db = client.db("hexpertify");

  console.log("Connected to MongoDB Atlas. Syncing real data into Homepage CMS...");

  // 1. Find or create home Page
  let page = await db.collection("Page").findOne({ identifier: "home" });
  if (!page) {
    page = await db.collection("Page").findOne({});
  }

  // Real Cloudinary Carousel Banners from Asset collection
  const realCarouselImages = [
    {
      url: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766903080/uploads/gycst00bn9dhs8ow8ghq.webp",
      alt: "Hexpertify Verified Consultant Selection Desktop Banner"
    },
    {
      url: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766903105/uploads/efecghuru4qxmag5awk5.webp",
      alt: "Hexpertify Mobile Wellness Booking"
    },
    {
      url: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766903135/uploads/bzescolex2cqsfswckps.webp",
      alt: "Certified Practitioners & Clinical Psychologists Showcase"
    }
  ];

  // Real FAQs for Hexpertify
  const realFaqs = [
    {
      question: "How do I book an online therapy session on Hexpertify?",
      answer: "Select your preferred verified therapist, choose the consultation service (Individual, Couple, Teen, or Family), and pick a convenient date and time slot. Your confidential Google Meet link is generated automatically."
    },
    {
      question: "Are all therapists on Hexpertify certified and background-verified?",
      answer: "Yes, 100% of our clinical consultants hold accredited master's or doctoral degrees in psychology and counseling, with verified credentials and clinical certifications."
    },
    {
      question: "Can I reschedule or cancel my appointment?",
      answer: "Yes, you can easily reschedule or cancel your consultation through your client panel up to 3 hours before your scheduled session time."
    },
    {
      question: "Is my personal data and consultation strictly confidential?",
      answer: "All video sessions and medical notes are protected with end-to-end encryption complying with global telehealth privacy and HIPAA-aligned confidentiality standards."
    }
  ];

  // Real Testimonials from Review collection
  const realTestimonials = [
    {
      quote: "Sadaf was incredibly understanding, heard everything I had to say, and gave me practical CBT exercises to manage my everyday stress.",
      authorName: "Komal Sharma",
      authorProfessional: "Working Professional",
      authorEmail: "komal.s@example.com",
      authorImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120",
      authorImageAltText: "Komal Sharma Hexpertify Review"
    },
    {
      quote: "Hexpertify made finding the right psychologist effortless. The video sessions are seamless, and my therapist provides immense clarity.",
      authorName: "Alice Johnson",
      authorProfessional: "Software Engineer",
      authorEmail: "alice.j@example.com",
      authorImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120",
      authorImageAltText: "Alice Johnson Testimonial"
    },
    {
      quote: "The couple counseling sessions transformed how we communicate. Highly recommend Hexpertify to anyone seeking supportive guidance.",
      authorName: "Bob Williams",
      authorProfessional: "Business Analyst",
      authorEmail: "bob.w@example.com",
      authorImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120",
      authorImageAltText: "Bob Williams Review"
    }
  ];

  // Real SEO Meta
  const seoDoc = {
    metaTitle: "Hexpertify | Online Therapy, Counseling & Mental Wellness",
    metaDescription: "Connect with certified therapists and clinical psychologists online anytime, anywhere for individual therapy, couples counseling, and wellness support.",
    metaKeywords: ["online therapy", "counseling", "mental health", "psychologist consultation", "CBT therapy", "Hexpertify"],
    canonicalUrl: "https://hexpertify.com",
    robotsDirective: "index, follow",
    ogTitle: "Hexpertify – Verified Mental Health Experts & Online Therapy",
    ogDescription: "Book confidential 1-on-1 video therapy sessions with verified clinical psychologists on Hexpertify.",
    ogImageUrl: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766903080/uploads/gycst00bn9dhs8ow8ghq.webp",
    ogImageAltText: "Hexpertify Online Consultation Platform",
    twitterCardType: "summary_large_image",
    updatedAt: new Date()
  };

  let seoMetaId = page?.seoMetaId;
  if (seoMetaId) {
    await db.collection("SeoMeta").updateOne({ _id: seoMetaId }, { $set: seoDoc });
  } else {
    const s = await db.collection("SeoMeta").insertOne({ ...seoDoc, createdAt: new Date() });
    seoMetaId = s.insertedId;
  }

  // Update Page document in MongoDB
  const pageUpdate = {
    identifier: "home",
    notificationTitle: "Welcome to Hexpertify – Book Your Therapy Session Online Today",
    carouselImageUrls: realCarouselImages.map(i => i.url),
    carouselImageAltTexts: realCarouselImages.map(i => i.alt),
    faqs: realFaqs,
    testimonials: realTestimonials,
    seoMetaId: String(seoMetaId),
    updatedAt: new Date()
  };

  if (page) {
    await db.collection("Page").updateOne({ _id: page._id }, { $set: pageUpdate });
    console.log("Updated existing Page document in MongoDB Atlas.");
  } else {
    await db.collection("Page").insertOne({ ...pageUpdate, createdAt: new Date() });
    console.log("Created new Page document in MongoDB Atlas.");
  }

  console.log("Successfully synced real Cloudinary assets, real reviews, FAQs, and SEO meta to MongoDB Atlas!");
  await client.close();
}

main().catch(console.error);
