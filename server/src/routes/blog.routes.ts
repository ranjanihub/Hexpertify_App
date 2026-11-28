import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { requireAdminOrInternal } from '../services/clinical-access';

const router = Router();

// Reading published posts is public; submitting needs a signed-in therapist or admin (checked in the
// controller); reviewing, publishing, editing and deleting are for the admin team only.

// Blog Outlines / Pitches endpoints (registered before the root-level '/:id' aliases, which would
// otherwise capture '/outlines')
router.get('/outlines', BlogController.getAllOutlines);
router.post('/outlines', BlogController.createOutline);
router.put('/outlines/:id/review', requireAdminOrInternal, BlogController.reviewOutline);
router.patch('/outlines/:id/review', requireAdminOrInternal, BlogController.reviewOutline);
router.delete('/outlines/:id', requireAdminOrInternal, BlogController.deleteOutline);

// Blog Posts endpoints
router.get('/posts', BlogController.getAllPosts);
router.get('/posts/:id', BlogController.getPostById);
router.post('/posts', BlogController.createPost);
router.put('/posts/:id/review', requireAdminOrInternal, BlogController.reviewPost);
router.patch('/posts/:id/review', requireAdminOrInternal, BlogController.reviewPost);
router.put('/posts/:id', requireAdminOrInternal, BlogController.updatePost);
router.patch('/posts/:id', requireAdminOrInternal, BlogController.updatePost);
router.delete('/posts/:id', requireAdminOrInternal, BlogController.deletePost);

// Fallback aliases for root level collection queries (/api/blogs)
router.get('/', BlogController.getAllPosts);
router.get('/:id', BlogController.getPostById);
router.post('/', BlogController.createPost);
router.put('/:id/review', requireAdminOrInternal, BlogController.reviewPost);
router.patch('/:id/review', requireAdminOrInternal, BlogController.reviewPost);
router.delete('/:id', requireAdminOrInternal, BlogController.deletePost);

export default router;
