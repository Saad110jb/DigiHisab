/**
 * Generates a 100% unique Invoice / Reference Number in the format:
 * INV-<VENDOR_SLUG>-<YYYYMMDD>-<HHMMSS>
 *
 * Example: INV-ALI-20260929-164220
 */
export const generateUniqueInvoiceNo = (vendorName?: string): string => {
  const cleanVendor = (vendorName || 'SUPPLIER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'SUPPLIER';

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return `INV-${cleanVendor}-${yyyy}${mm}${dd}-${hh}${min}${ss}`;
};
