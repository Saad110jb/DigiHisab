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
  runKametiDraw,
  disburseKametiPayout,
  getKametiPayoutVoucher,
  sendKametiReminders,
  getKametiMatrix,
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

// Kameti Draw & Payout Engine
router.post('/:id/run-draw', runKametiDraw);
router.post('/:id/disburse-payout', disburseKametiPayout);
router.get('/:id/payout-voucher/:cycleNumber', getKametiPayoutVoucher);
router.post('/:id/send-reminders', sendKametiReminders);
router.get('/:id/matrix', getKametiMatrix);

// Multi-user member management & WhatsApp / push notification sync
router.post('/:id/members', addMemberToKameti);
router.post('/:id/members/:memberId/toggle-paid', toggleMemberPayment);
router.get('/:id/members/:memberId/invite-text', getMemberInviteText);
router.delete('/:id/members/:memberId', deleteMemberFromKameti);
router.patch('/:id/swap-payout-months', swapPayoutMonths);

export default router;
