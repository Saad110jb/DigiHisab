import { Request, Response } from 'express';
import { DomesticAuditUpdateService } from '../services/domesticAuditUpdate.service';

/**
 * 1. Query all domestic records across modules with search & category filters
 * GET /api/v1/domestic/audit/records
 */
export const getAllDomesticRecords = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const { module, searchQuery, limit } = req.query;

    const records = await DomesticAuditUpdateService.getAllDomesticRecords(profileId, {
      module: module ? String(module) : undefined,
      searchQuery: searchQuery ? String(searchQuery) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Query Domestic Audit Trail
 * GET /api/v1/domestic/audit/trail
 */
export const getDomesticAuditTrail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const { module, limit } = req.query;

    const logs = await DomesticAuditUpdateService.getDomesticAuditTrail(profileId, {
      module: module ? String(module) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Update any domestic record with automated JEV Vault re-balancing & audit logging
 * PUT /api/v1/domestic/audit/records
 */
export const updateDomesticRecord = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const payload = req.body;

    if (!payload.module || !payload.recordId || !payload.reasonUrdu) {
      return res.status(400).json({
        success: false,
        message: 'module, recordId اور reasonUrdu درکار ہیں۔',
      });
    }

    const result = await DomesticAuditUpdateService.updateDomesticRecord(profileId, payload);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Void / Delete a domestic entry with automatic vault refund
 * POST /api/v1/domestic/audit/delete
 */
export const deleteDomesticRecord = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const payload = req.body;

    if (!payload.module || !payload.recordId) {
      return res.status(400).json({
        success: false,
        message: 'module اور recordId درکار ہیں۔',
      });
    }

    const result = await DomesticAuditUpdateService.deleteDomesticRecord(profileId, payload);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. 1-Tap Revert of a domestic audit change
 * POST /api/v1/domestic/audit/revert
 */
export const revertDomesticAuditLog = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const { auditLogId, reasonUrdu } = req.body;

    if (!auditLogId) {
      return res.status(400).json({
        success: false,
        message: 'auditLogId درکار ہے۔',
      });
    }

    const result = await DomesticAuditUpdateService.revertDomesticAuditLog(
      profileId,
      auditLogId,
      reasonUrdu
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Reconcile physical cash safe count & log discrepancy
 * POST /api/v1/domestic/audit/reconcile-vault
 */
export const reconcileVaultPhysicalCount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const payload = req.body;

    if (!payload.vaultAccountId || payload.physicalCountAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'vaultAccountId اور physicalCountAmount درکار ہیں۔',
      });
    }

    const result = await DomesticAuditUpdateService.reconcileVaultPhysicalCount(profileId, payload);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
