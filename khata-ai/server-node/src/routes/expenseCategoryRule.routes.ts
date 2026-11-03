import { Router } from 'express';
import {
  createCategoryRule,
  getCategoryRules,
  getCategoryRuleById,
  updateCategoryRule,
  addKeywordsToRule,
  removeKeywordFromRule,
  toggleRuleActiveStatus,
  deleteCategoryRule,
  matchCategoryFromText,
  getCategoryBudgetStatus,
} from '../controllers/expenseCategoryRule.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all category rule endpoints with JWT authentication
router.use(requireAuth);

router.post('/match-text', matchCategoryFromText);
router.get('/budget-status', getCategoryBudgetStatus);

router.route('/')
  .post(createCategoryRule)
  .get(getCategoryRules);

router.route('/:id')
  .get(getCategoryRuleById)
  .put(updateCategoryRule)
  .delete(deleteCategoryRule);

router.post('/:id/keywords', addKeywordsToRule);
router.delete('/:id/keywords', removeKeywordFromRule);
router.patch('/:id/toggle-active', toggleRuleActiveStatus);

export default router;
