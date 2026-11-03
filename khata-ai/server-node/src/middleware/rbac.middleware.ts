import { Request, Response, NextFunction } from 'express';
import { SubAccountRole } from '../models/Profile';

export type Role = SubAccountRole | 'OWNER';

export const authorizeRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userRole = (req.user.role || 'OWNER') as Role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: '🔒 رسائی کی اجازت نہیں: آپ کے پاس اس فیچر کو استعمال کرنے کے اختیارات نہیں ہیں۔',
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
      return;
    }

    next();
  };
};

export const requireRole = authorizeRole;
