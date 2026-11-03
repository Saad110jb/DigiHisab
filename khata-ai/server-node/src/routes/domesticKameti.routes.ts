import { Router } from 'express';
import {
  getDomesticKametis,
  createDomesticKameti,
  payKametiInstallment,
  collectKametiPayout,
  advanceKametiCycle,
  deleteDomesticKameti,
  getKametiShareSlip,
  lookupMemberByPhone,
  addMemberToKameti,
  toggleMemberPayment,
  getMemberInviteText,
  swapPayoutMonths,
  deleteMemberFromKameti,
} from '../controllers/domesticKameti.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getDomesticKametis);
router.post('/', createDomesticKameti);
router.post('/lookup-member', lookupMemberByPhone);
router.post('/:id/pay-installment', payKametiInstallment);
router.post('/:id/collect-payout', collectKametiPayout);
router.patch('/:id/advance-cycle', advanceKametiCycle);
router.delete('/:id', deleteDomesticKameti);
router.get('/:id/share-text', getKametiShareSlip);

// Multi-user member management & WhatsApp / push notification sync
router.post('/:id/members', addMemberToKameti);
router.post('/:id/members/:memberId/toggle-paid', toggleMemberPayment);
router.get('/:id/members/:memberId/invite-text', getMemberInviteText);
router.delete('/:id/members/:memberId', deleteMemberFromKameti);
router.patch('/:id/swap-payout-months', swapPayoutMonths);

export default router;
