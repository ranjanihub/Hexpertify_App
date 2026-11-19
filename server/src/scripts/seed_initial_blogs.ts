import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function seedBlogs() {
  const db = await connectToDatabase();

  const count = await db.collection('BlogPost').countDocuments();
  console.log(`[Seed Blogs] Existing blog posts in database: ${count}`);

  if (count === 0) {
    console.log('[Seed Blogs] Seeding sample blog posts...');
    const initialBlogs = [
      {
        id: 1001,
        title: '5 Proven CBT Techniques to Overcome Workplace Burnout',
        category: 'Anxiety & Stress',
        tags: ['Burnout', 'CBT', 'Mental Health', 'Workplace Wellness'],
        content: `Workplace burnout is more than just feeling overworked—it is a state of emotional, physical, and mental exhaustion caused by excessive and prolonged stress.\n\n### Core CBT Interventions\n1. **Identify Cognitive Distortions**: Spot all-or-nothing thinking and catastrophizing.\n2. **Practice Box Breathing**: 4 counts inhale, 4 hold, 4 exhale, 4 hold.\n3. **Set Emotional Boundaries**: Learn to decline non-essential tasks without guilt.\n4. **Cognitive Restructuring**: Replace "I must finish everything today" with "I will prioritize key milestones."\n5. **Behavioral Activation**: Schedule restorative leisure activities.`,
        featuredImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop',
        status: 'published',
        author: 'Dr. Evelyn Reed, PhD',
        authorEmail: 'dr.evelyn@hexpertify.com',
        authorRole: 'Licensed Clinical Psychologist',
        authorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        consultantId: 'doc-1',
        reviewNotes: 'Approved for public clinical reading.',
        reviewedBy: 'Super Admin',
        reviewedAt: '2026-08-01T10:00:00.000Z',
        createdAt: '2026-07-26T14:30:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 1002,
        title: 'Understanding the Neurological Basis of Panic Attacks',
        category: 'Panic & Trauma',
        tags: ['Panic', 'Neuroscience', 'Grounding', 'Anxiety'],
        content: `During a panic episode, the amygdala signals an acute emergency even when there is no objective threat. This triggers a sudden surge of adrenaline, elevating heart rate and hyperventilating.\n\n### Clinical Management Protocol\n- **Somatic De-escalation**: Sensory grounding through temperature shifts (cold water splashing).\n- **Interoceptive Exposure**: Gradually retraining tolerance for benign sensations like elevated pulse.\n- **Reframing Physical Sensations**: Acknowledging that panic is uncomfortable but not biologically dangerous.`,
        featuredImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
        status: 'pending',
        author: 'Dr. Evelyn Reed, PhD',
        authorEmail: 'dr.evelyn@hexpertify.com',
        authorRole: 'Licensed Clinical Psychologist',
        authorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        consultantId: 'doc-1',
        reviewNotes: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 1003,
        title: 'Integrative Sleep Hygiene for Generalized Anxiety Disorder',
        category: 'Lifestyle Medicine',
        tags: ['Sleep', 'GAD', 'Insomnia', 'Recovery'],
        content: `Sleep disruption and anxiety form a bidirectional loop: insomnia exacerbates daytime anxiety, while nocturnal worry delays sleep onset.\n\n### Recommended Clinical Interventions\n- **Stimulus Control Therapy**: Dedicate the bedroom strictly for sleeping.\n- **Worry Time Scheduling**: Designate 15 minutes in late afternoon to journal worries rather than at bedtime.\n- **Blue Light Decoupling**: 60-minute digital curfew before sleep.`,
        featuredImage: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?w=800&auto=format&fit=crop',
        status: 'pending',
        author: 'Dr. Evelyn Reed, PhD',
        authorEmail: 'dr.evelyn@hexpertify.com',
        authorRole: 'Licensed Clinical Psychologist',
        authorAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        consultantId: 'doc-1',
        reviewNotes: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ];

    await db.collection('BlogPost').insertMany(initialBlogs as any);
    console.log('[Seed Blogs] Seeded 3 initial blog posts successfully!');
  }

  const outlineCount = await db.collection('BlogOutline').countDocuments();
  if (outlineCount === 0) {
    const initialOutlines = [
      {
        id: 2001,
        proposedTitle: 'Navigating Life Transitions with Acceptance & Commitment Therapy (ACT)',
        keyPoints: [
          'Defining ACT and psychological flexibility',
          'Clarifying personal core values during career and relationship shifts',
          'Defusion techniques for fear of uncertainty',
          'Actionable steps for daily value-aligned commitments',
        ],
        targetAudience: 'Adults navigating career changes, parenthood, or relocation',
        keywords: ['ACT Therapy', 'Life Transitions', 'Values', 'Mindfulness'],
        notes: 'Pitch outline submitted for clinical communications review.',
        status: 'pending',
        author: 'Dr. Evelyn Reed, PhD',
        authorEmail: 'dr.evelyn@hexpertify.com',
        authorRole: 'Licensed Clinical Psychologist',
        reviewNotes: '',
        reviewedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];

    await db.collection('BlogOutline').insertMany(initialOutlines as any);
    console.log('[Seed Blogs] Seeded 1 sample outline pitch successfully!');
  }

  await closeDatabase();
}

seedBlogs().catch(console.error);
