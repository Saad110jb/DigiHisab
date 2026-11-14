import crypto from 'crypto';
import { superAdminSecurityState } from './totp';

export function generateNewBreakGlassCodes(): string[] {
  const newCodes = Array.from({ length: 10 }, () => {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `DH-${part1}-${part2}`;
  });

  superAdminSecurityState.emergencyCodes = newCodes.map((code) => ({
    code,
    used: false,
  }));

  return newCodes;
}
