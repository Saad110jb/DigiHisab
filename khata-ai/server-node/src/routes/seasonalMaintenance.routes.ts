import { Router } from 'express';
import {
  getSeasonalMaintenanceDashboard,
  getHouseholdApplianceList,
  createHouseholdAppliance,
  logMaintenanceJob,
  getTechnicianDirectory,
  getActiveWarranties,
  deleteHouseholdAppliance,
} from '../controllers/seasonalMaintenance.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// 1. Dashboard & Radar
router.get('/dashboard', getSeasonalMaintenanceDashboard);

// 2. Household Appliance Registry
router.route('/assets')
  .get(getHouseholdApplianceList)
  .post(createHouseholdAppliance);

router.delete('/assets/:id', deleteHouseholdAppliance);

// 3. Maintenance Jobs & Sinking Fund Vault Sync
router.post('/jobs', logMaintenanceJob);

// 4. Trusted Karigar Directory
router.get('/technicians', getTechnicianDirectory);

// 5. Active Warranties Radar
router.get('/warranties', getActiveWarranties);

export default router;
