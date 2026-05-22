import { Router } from 'express';
import { createIssue, getAllIssues, getSingleIssue, updateIssue, deleteIssue, getMetrics } from '../controllers/issueController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllIssues);
router.get('/metrics', authenticate, authorizeRoles('maintainer'), getMetrics); // must be before /:id
router.get('/:id', getSingleIssue);

router.use(authenticate);
router.post('/', createIssue);
router.patch('/:id', updateIssue);
router.delete('/:id', authorizeRoles('maintainer'), deleteIssue);

export default router;