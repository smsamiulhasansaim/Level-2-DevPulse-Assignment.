import { Router } from 'express';
import { createIssue, getAllIssues, getSingleIssue, updateIssue, deleteIssue } from '../controllers/issueController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllIssues);
router.get('/:id', getSingleIssue);

// Protected Routes
router.use(authenticate);

router.post('/', createIssue);
router.patch('/:id', updateIssue);
router.delete('/:id', authorizeRoles('maintainer'), deleteIssue);

export default router;