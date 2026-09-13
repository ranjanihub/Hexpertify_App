/// <reference types="node" />

interface BlogPostResponse {
  _id?: string;
  id: string | number;
  title: string;
  category: string;
  tags?: string[];
  content: string;
  status: string;
  author?: string;
  reviewNotes?: string;
}

interface ReviewResponse {
  success: boolean;
  message?: string;
  post?: BlogPostResponse;
}

async function testWorkflow() {
  const baseUrl = 'http://localhost:5000';

  console.log('--- Step 1: Submit Blog Post as Consultant ---');
  const postPayload = {
    title: 'Cognitive Restructuring for Acute Stress Responses',
    category: 'Anxiety',
    tags: ['CBT', 'Stress', 'Cognitive Restructuring'],
    content:
      'Cognitive restructuring is a psychotherapeutic process of identifying and disputing irrational or maladaptive thoughts. When practiced consistently, individuals experience significant reductions in somatic tension and panic symptoms.',
    featuredImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
    author: 'Dr. Evelyn Reed, PhD',
    authorEmail: 'dr.evelyn@hexpertify.com',
    authorRole: 'Licensed Clinical Psychologist',
    consultantId: 'doc-1',
  };

  const createRes = await fetch(`${baseUrl}/api/blog/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload),
  });

  const createdPost = (await createRes.json()) as BlogPostResponse;
  console.log('Created Post Response:', createdPost.title, '| ID:', createdPost.id, '| Status:', createdPost.status);

  if (createdPost.status !== 'pending' && createdPost.status !== 'submitted') {
    throw new Error(`Expected status to be pending, got: ${createdPost.status}`);
  }

  console.log('\n--- Step 2: Query All Posts (Consultant & Admin List) ---');
  const listRes = await fetch(`${baseUrl}/api/blog/posts`);
  const allPosts = (await listRes.json()) as BlogPostResponse[];
  console.log(`Total blogs retrieved: ${allPosts.length}`);
  const found = allPosts.find((p) => p.id === createdPost.id || p.title === createdPost.title);
  console.log('Found newly submitted blog in list:', Boolean(found), 'Status:', found?.status);

  console.log('\n--- Step 3: Admin Review -> Approve & Publish ---');
  const reviewRes = await fetch(`${baseUrl}/api/blog/posts/${createdPost.id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'published',
      reviewNotes: 'Clinically rigorous article. Approved for immediate public indexing.',
      reviewedBy: 'Super Admin',
    }),
  });

  const reviewResult = (await reviewRes.json()) as ReviewResponse;
  console.log('Review Result:', reviewResult);

  console.log('\n--- Step 4: Verify Status After Review ---');
  const verifyRes = await fetch(`${baseUrl}/api/blog/posts/${createdPost.id}`);
  const verifiedPost = (await verifyRes.json()) as BlogPostResponse;
  console.log('Verified Post Status:', verifiedPost.status, '| Review Notes:', verifiedPost.reviewNotes);

  if (verifiedPost.status !== 'published') {
    throw new Error(`Expected post status to be 'published', got: ${verifiedPost.status}`);
  }

  console.log('\n✅ ALL BACKEND WORKFLOW STEPS PASSED SUCCESSFULLY!');
}

testWorkflow().catch((err) => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
