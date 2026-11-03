import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Profile, PersonaType, SubAccountRole } from '../models/Profile';
import { Types } from 'mongoose';

export interface AuthPayload {
  id?: string;
  profileId?: string;
  subAccountId?: string;
  phone?: string;
  role?: SubAccountRole | 'OWNER';
  permissions?: string[];
  activePersona: PersonaType;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: Types.ObjectId;
        profileId: Types.ObjectId;
        subAccountId?: Types.ObjectId;
        phone?: string;
        activePersona: PersonaType;
        role?: SubAccountRole | 'OWNER';
        permissions?: string[];
      };
    }
  }
}

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      if (env.NODE_ENV === 'development') {
        const devProfile = await Profile.findOne();
        if (devProfile) {
          req.user = {
            id: devProfile._id as Types.ObjectId,
            profileId: devProfile._id as Types.ObjectId,
            phone: devProfile.phone,
            activePersona: devProfile.activePersona,
          };
          next();
          return;
        }
      }
      res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    const targetProfileId = decoded.id || decoded.profileId;
    if (!targetProfileId) {
      res.status(401).json({ success: false, message: 'Invalid token payload' });
      return;
    }

    const profile = await Profile.findById(targetProfileId);
    if (!profile) {
      res.status(401).json({ success: false, message: 'User profile no longer exists' });
      return;
    }

    const objectId = new Types.ObjectId(targetProfileId);

    req.user = {
      id: objectId,
      profileId: objectId,
      subAccountId: decoded.subAccountId ? new Types.ObjectId(decoded.subAccountId) : undefined,
      phone: decoded.phone || profile.phone,
      activePersona: decoded.activePersona || profile.activePersona,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      const devProfile = await Profile.findOne();
      if (devProfile) {
        req.user = {
          id: devProfile._id as Types.ObjectId,
          profileId: devProfile._id as Types.ObjectId,
          phone: devProfile.phone,
          activePersona: devProfile.activePersona,
        };
        next();
        return;
      }
    }
    res.status(401).json({ success: false, message: 'Not authorized, token validation failed' });
  }
};

export const requireAuth = protect;

export const requirePersona = (...allowedPersonas: PersonaType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.activePersona !== 'HYBRID' && !allowedPersonas.includes(req.user.activePersona)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Active persona '${req.user.activePersona}' does not have permission for this resource. Required: ${allowedPersonas.join(', ')}`,
      });
      return;
    }

    next();
  };
};

export const requireRole = (...allowedRoles: (SubAccountRole | 'OWNER')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userRole = (req.user.role || 'OWNER') as (SubAccountRole | 'OWNER');

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

export const authorizeRole = requireRole;
