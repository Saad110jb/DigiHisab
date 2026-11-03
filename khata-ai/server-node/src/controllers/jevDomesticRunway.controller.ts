import { Request, Response } from 'express';
import { JevDomesticRunwayService } from '../services/jevDomesticRunway.service';

/**
 * 1. Get 30-Day Domestic Kitchen Runway & Deficit Status
 * GET /api/v1/domestic/runway/status
 */
export const getRunwayStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const trajectory = await JevDomesticRunwayService.calculateRunwayTrajectory(profileId);

    return res.status(200).json({
      success: true,
      data: trajectory,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Upcoming Committed Household Obligations Calendar
 * GET /api/v1/domestic/runway/obligations
 */
export const getUpcomingObligations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const trajectory = await JevDomesticRunwayService.calculateRunwayTrajectory(profileId);

    return res.status(200).json({
      success: true,
      data: {
        upcomingObligations: trajectory.upcomingObligations,
        totalCommittedPending: trajectory.totalCommittedPending,
        nextSalaryDate: trajectory.nextSalaryDate,
        daysToNextSalary: trajectory.daysToNextSalary,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Simulate What-If Impact of a Proposed Domestic Expense
 * POST /api/v1/domestic/runway/simulate-expense
 */
export const simulateExpenseImpact = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const { proposedAmount, proposedExpenseAmount } = req.body;
    const amount = proposedAmount || proposedExpenseAmount;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive proposedAmount (PKR) is required.',
      });
    }

    const simulation = await JevDomesticRunwayService.simulateProposedExpense(
      profileId,
      Number(amount)
    );

    return res.status(200).json({
      success: true,
      data: simulation,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
