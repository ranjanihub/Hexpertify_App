import { PrismaClient, BookingStatus } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started... 🌱");

  // --- Clean up existing data ---
  console.log("Deleting previous data...");
  await prisma.booking.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.consultant.deleteMany({});
  await prisma.profession.deleteMany({});
  await prisma.authenticator.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.page.deleteMany({});
  await prisma.seoMeta.deleteMany({});
  console.log("Previous data deleted.");
  // --- Create Users ---
  const user1 = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Johnson",
      role: "USER",
      emailVerified: new Date(),
    },
  });
  const user2 = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Williams",
      role: "USER",
      emailVerified: new Date(),
    },
  });
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log("Created users:", user1.name, user2.name, adminUser.name);

  // --- Create SEO Meta for Professions ---
  const seoProfessionAstrology = await prisma.seoMeta.create({
    data: {
      metaTitle: "Expert Vedic Astrologers | Online Astrology Readings",
      metaDescription:
        "Connect with certified Vedic Astrologers for accurate predictions on career, love, and life. Book your session today.",
      metaKeywords: ["vedic astrology", "online astrologer", "birth chart"],
    },
  });

  const seoProfessionTarot = await prisma.seoMeta.create({
    data: {
      metaTitle: "Expert Tarot Readers | Online Tarot Readings",
      metaDescription:
        "Connect with certified Tarot readers for love, career, and spiritual guidance. Book your session today.",
      metaKeywords: ["tarot reading", "online tarot", "spiritual guidance"],
    },
  });

  // --- Create Professions and link SEO ---
  const professionAstrology = await prisma.profession.create({
    data: {
      identifier: "vedic-astrologer",
      name: "Vedic Astrologer",
      imageUrl: "https://example.com/images/astrology.png",
      faqs: [
        {
          question: "What is Vedic Astrology?",
          answer: "It is the traditional Hindu system of astrology.",
        },
        {
          question: "How is it different from Western astrology?",
          answer:
            "It uses a different zodiac system and has a greater emphasis on planetary periods.",
        },
      ],
      seoMetaId: seoProfessionAstrology.id,
    },
  });

  const professionTarot = await prisma.profession.create({
    data: {
      identifier: "tarot-card-reader",
      name: "Tarot Card Reader",
      imageUrl: "https://example.com/images/tarot.png",
      faqs: [],
      seoMetaId: seoProfessionTarot.id,
    },
  });
  console.log(
    "Created professions:",
    professionAstrology.name,
    professionTarot.name,
  );

  // --- Create SEO Meta for Consultants ---
  const seoConsultant1 = await prisma.seoMeta.create({
    data: {
      metaTitle: "Book a Reading with Dr. Evelyn Reed | Vedic Astrologer",
      metaDescription:
        "Get accurate life predictions from Dr. Evelyn Reed, a specialist in Vedic astrology.",
      metaKeywords: ["vedic astrology", "evelyn reed", "birth chart reading"],
    },
  });

  const seoConsultant2 = await prisma.seoMeta.create({
    data: {
      metaTitle: "Book a Reading with Marcus Thorne | Tarot Expert",
      metaDescription:
        "Get spiritual guidance from Marcus Thorne, a specialist in Tarot readings for love and career.",
      metaKeywords: ["tarot reading", "marcus thorne", "spiritual guidance"],
    },
  });

  const seoConsultant3 = await prisma.seoMeta.create({
    data: {
      metaTitle: "Book a Session with Sophia Chakra | Energy Healer",
      metaDescription:
        "Experience chakra balancing and energy healing with Sophia Chakra, a certified holistic wellness expert.",
      metaKeywords: [
        "chakra healing",
        "energy healing",
        "sophia chakra",
        "wellness",
      ],
    },
  });
  console.log("Created SEO metadata for consultants.");

  // --- Create Consultants ---
  const consultant1 = await prisma.consultant.create({
    data: {
      name: "Dr. Evelyn Reed",
      identifier: "evelyn-reed",
      email: "evelyn.reed@example.com",
      clientCount: 150,
      photoUrl: "https://example.com/images/evelyn.jpg",
      youtubeUrl: "https://youtube.com/evelynreed",
      experience: 15,
      languages: ["English", "Hindi"],
      about:
        "A seasoned Vedic Astrologer with over 15 years of experience in natal chart reading and predictive astrology.",
      isCertified: true,
      specialties: [
        "Career Astrology",
        "Relationship Compatibility",
        "Horary Astrology",
      ],
      qualifications: ["PhD in Astrology", "Certified Vedic Astrologer"],
      certificateUrls: ["https://example.com/certs/cert1.pdf"],
      faqs: [
        {
          question: "What do I need for a reading?",
          answer: "Your date, time, and place of birth.",
        },
      ],
      professionId: professionAstrology.id,
      seoMetaId: seoConsultant1.id,
    },
  });

  const consultant2 = await prisma.consultant.create({
    data: {
      name: "Marcus Thorne",
      identifier: "marcus-thorne",
      email: "marcus.thorne@example.com",
      clientCount: 85,
      photoUrl: "https://example.com/images/marcus.jpg",
      experience: 8,
      languages: ["English", "Spanish"],
      about:
        "An intuitive Tarot reader specializing in Rider-Waite and Thoth decks.",
      isCertified: false,
      specialties: ["Love Readings", "Career Path", "Spiritual Guidance"],
      qualifications: ["Certified Tarot Master"],
      professionId: professionTarot.id,
      seoMetaId: seoConsultant2.id,
    },
  });

  const consultant3 = await prisma.consultant.create({
    data: {
      name: "Sophia Chakra",
      identifier: "sophia-chakra",
      email: "sophia.chakra@example.com",
      clientCount: 200,
      photoUrl: "https://example.com/images/sophia.jpg",
      youtubeUrl: "https://youtube.com/sophiachakra",
      experience: 12,
      languages: ["English", "Hindi", "Sanskrit"],
      about:
        "Holistic wellness expert specializing in chakra balancing and energy healing.",
      isCertified: true,
      specialties: [
        "Chakra Healing",
        "Energy Cleansing",
        "Meditation Guidance",
      ],
      qualifications: ["Certified Energy Healer", "Reiki Master"],
      certificateUrls: [
        "https://example.com/certs/reiki.pdf",
        "https://example.com/certs/energy.pdf",
      ],
      faqs: [
        {
          question: "What is chakra balancing?",
          answer:
            "It's a holistic practice to align your body's energy centers.",
        },
        {
          question: "How many sessions do I need?",
          answer: "Typically 3-5 sessions for noticeable results.",
        },
      ],
      professionId: professionAstrology.id,
      seoMetaId: seoConsultant3.id,
    },
  });
  console.log(
    "Created consultants:",
    consultant1.name,
    consultant2.name,
    consultant3.name,
  );

  // --- Create Services ---
  const service1 = await prisma.service.create({
    data: {
      name: "Full Birth Chart Reading",
      price: 99.99,
      duration: 60,
      sessionCount: 1,
      platform: "G-Meet",
      consultantId: consultant1.id,
    },
  });
  const service2 = await prisma.service.create({
    data: {
      name: "30-Minute Tarot Spread",
      price: 45.0,
      duration: 30,
      sessionCount: 1,
      platform: "Zoom",
      consultantId: consultant2.id,
    },
  });
  const service3 = await prisma.service.create({
    data: {
      name: "Chakra Balancing Session",
      price: 75.0,
      duration: 45,
      sessionCount: 1,
      platform: "G-Meet",
      consultantId: consultant3.id,
    },
  });
  const service4 = await prisma.service.create({
    data: {
      name: "5-Session Astrology Package",
      price: 399.99,
      duration: 60,
      sessionCount: 5,
      platform: "G-Meet",
      consultantId: consultant1.id,
    },
  });
  console.log(
    "Created services:",
    service1.name,
    service2.name,
    service3.name,
    service4.name,
  );

  // --- Create Reviews ---
  await prisma.review.create({
    data: {
      rating: 5,
      comment:
        "Evelyn was incredibly accurate and insightful. She provided detailed insights into my career path.",
      clientName: "Alice Johnson",
      clientTitle: "Software Engineer",
      authorId: user1.id,
      consultantId: consultant1.id,
      imageUrls: [],
      imageAltTexts: [],
    },
  });
  await prisma.review.create({
    data: {
      rating: 4,
      comment:
        "A very good reading. Marcus has a calming presence and great intuition.",
      clientName: "Bob Williams",
      clientTitle: "Business Analyst",
      authorId: user2.id,
      consultantId: consultant2.id,
      imageUrls: [],
      imageAltTexts: [],
    },
  });
  await prisma.review.create({
    data: {
      rating: 5,
      comment:
        "Sophia's chakra balancing session was transformative. I felt immediate relief and clarity.",
      clientName: "Emma Davis",
      clientTitle: "Yoga Instructor",
      consultantId: consultant3.id,
      imageUrls: [],
      imageAltTexts: [],
    },
  });
  console.log("Created reviews.");

  // --- Create Bookings ---
  await prisma.booking.create({
    data: {
      status: BookingStatus.COMPLETED,
      userId: user1.id,
      consultantId: consultant1.id,
      serviceId: service1.id,
    },
  });
  await prisma.booking.create({
    data: {
      status: BookingStatus.CONFIRMED,
      userId: user2.id,
      consultantId: consultant2.id,
      serviceId: service2.id,
    },
  });
  await prisma.booking.create({
    data: {
      status: BookingStatus.PENDING,
      userId: user1.id,
      consultantId: consultant3.id,
      serviceId: service3.id,
    },
  });
  await prisma.booking.create({
    data: {
      status: BookingStatus.CONFIRMED,
      userId: user2.id,
      consultantId: consultant1.id,
      serviceId: service4.id,
    },
  });
  console.log("Created bookings.");

  // --- Create Page Content with SEO ---
  const seoPage = await prisma.seoMeta.create({
    data: {
      metaTitle: "Homepage - Expert Astrologers & Tarot Readers",
      metaDescription:
        "Book sessions with verified astrologers and tarot readers online. Accurate readings on career, love, and life.",
      metaKeywords: ["astrology", "tarot", "online readings"],
    },
  });

  await prisma.page.create({
    data: {
      identifier: "home",
      carouselImageUrls: [
        "https://example.com/images/carousel1.jpg",
        "https://example.com/images/carousel2.jpg",
        "https://example.com/images/carousel3.jpg",
      ],
      carouselImageAltTexts: [
        "Astrology consultation",
        "Tarot reading session",
        "Chakra healing",
      ],
      faqs: [
        {
          question: "How do I book a session?",
          answer:
            "Select a consultant, choose a service, and pick an available time slot. Payment is processed securely.",
        },
        {
          question: "Is my payment secure?",
          answer:
            "Yes, we use industry-standard encryption for all transactions.",
        },
        {
          question: "Can I reschedule my booking?",
          answer: "Yes, you can reschedule up to 24 hours before your session.",
        },
        {
          question: "What if I'm not satisfied?",
          answer:
            "We offer a satisfaction guarantee. Contact support for a refund or rescheduling.",
        },
      ],
      testimonials: [
        {
          quote:
            "This platform connected me with the best astrologer I have ever consulted. Highly recommended!",
          authorName: "Jane Doe",
          authorProfessional: "Software Engineer",
          authorImageUrl: "https://example.com/images/jane.jpg",
          authorEmail: "jane@example.com",
        },
        {
          quote:
            "The tarot reading was incredibly insightful and helped me make important life decisions.",
          authorName: "Michael Chen",
          authorProfessional: "Entrepreneur",
          authorImageUrl: "https://example.com/images/michael.jpg",
          authorEmail: "michael@example.com",
        },
        {
          quote:
            "Sophia's energy healing sessions have transformed my life. I feel more balanced and peaceful.",
          authorName: "Lisa Anderson",
          authorProfessional: "Wellness Coach",
          authorImageUrl: "https://example.com/images/lisa.jpg",
          authorEmail: "lisa@example.com",
        },
      ],
      seoMetaId: seoPage.id,
    },
  });
  console.log("Created page content.");

  console.log("Seeding finished. 🎉");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
