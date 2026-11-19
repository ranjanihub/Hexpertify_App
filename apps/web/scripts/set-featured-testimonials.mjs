import { MongoClient } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const db = client.db("hexpertify");

  console.log("Connected to MongoDB Atlas: hexpertify");

  // Filter and set only real curated homepage testimonials (not all raw session reviews)
  const featuredTestimonials = [
    {
      id: "TEST-1",
      authorName: "Komal Sharma",
      authorProfessional: "Working Professional",
      authorEmail: "komal.sharma@hexpertify.com",
      authorImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Komal%20Sharma",
      authorImageAltText: "Komal Sharma Hexpertify Client Review",
      quote: "Sadaf was incredibly understanding, heard everything I had to say, and gave me practical CBT exercises to manage my everyday stress."
    },
    {
      id: "TEST-2",
      authorName: "Alice Johnson",
      authorProfessional: "Software Engineer",
      authorEmail: "alice.johnson@hexpertify.com",
      authorImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice%20Johnson",
      authorImageAltText: "Alice Johnson Testimonial",
      quote: "Hexpertify made finding the right psychologist effortless. The video sessions are seamless, and my therapist provides immense clarity."
    },
    {
      id: "TEST-3",
      authorName: "Bob Williams",
      authorProfessional: "Business Analyst",
      authorEmail: "bob.williams@hexpertify.com",
      authorImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob%20Williams",
      authorImageAltText: "Bob Williams Review",
      quote: "The couple counseling sessions transformed how we communicate. Highly recommend Hexpertify to anyone seeking supportive guidance."
    },
    {
      id: "TEST-4",
      authorName: "Emma Davis",
      authorProfessional: "Yoga Instructor",
      authorEmail: "emma.davis@hexpertify.com",
      authorImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma%20Davis",
      authorImageAltText: "Emma Davis Testimonial",
      quote: "Sophia's chakra balancing session was transformative. I felt immediate relief and clarity."
    }
  ];

  await db.collection("Page").updateOne(
    { identifier: "home" },
    { $set: { testimonials: featuredTestimonials, updatedAt: new Date() } }
  );

  console.log(`Successfully updated Page document to display only ${featuredTestimonials.length} curated testimonials.`);

  await client.close();
}

main().catch(console.error);
