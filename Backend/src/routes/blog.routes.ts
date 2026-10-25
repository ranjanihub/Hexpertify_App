import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';

const router = Router();

// Blog Posts endpoints
router.get('/posts', BlogController.getAllPosts);
router.get('/posts/:id', BlogController.getPostById);
router.post('/posts', BlogController.createPost);
router.put('/posts/:id/review', BlogController.reviewPost);
router.patch('/posts/:id/review', BlogController.reviewPost);
router.put('/posts/:id', BlogController.updatePost);
router.patch('/posts/:id', BlogController.updatePost);
router.delete('/posts/:id', BlogController.deletePost);

// Fallback aliases for root level collection queries (/api/blogs)
router.get('/', BlogController.getAllPosts);
router.get('/:id', BlogController.getPostById);
router.post('/', BlogController.createPost);
router.put('/:id/review', BlogController.reviewPost);
router.patch('/:id/review', BlogController.reviewPost);
router.delete('/:id', BlogController.deletePost);

// Blog Outlines / Pitches endpoints
router.get('/outlines', BlogController.getAllOutlines);
router.post('/outlines', BlogController.createOutline);
router.put('/outlines/:id/review', BlogController.reviewOutline);
router.patch('/outlines/:id/review', BlogController.reviewOutline);
router.delete('/outlines/:id', BlogController.deleteOutline);

export default router;
