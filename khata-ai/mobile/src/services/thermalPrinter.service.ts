/**
 * Digi Hisab - Dual-Layer Bluetooth & Thermal Printer Transport Service
 *
 * Layer 1: Native Web Bluetooth API (Direct raw ESC/POS byte streaming via Bluetooth GATT SPP / UART)
 * Layer 2: Expo-Print Thermal Receipt Fallback (Zero native crashes, prints to Android Bluetooth Print Services, RawBT, or A4/WiFi)
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import {
  ThermalReceiptData,
  PaperWidth,
  buildPakistaniThermalReceipt,
} from '../utils/escposBuilder';

const STORAGE_KEY_LAST_BT_DEVICE = '@digihisab_last_bluetooth_printer';

// Known Bluetooth Thermal Printer GATT Services & Characteristics
const BLUETOOTH_PRINT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Chinese 58mm/80mm POS
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / MPT-II / POS-5802
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f1', // Nordic UART Service
];

export interface PrintResult {
  success: boolean;
  transport: 'BLUETOOTH_RAW' | 'EXPO_PRINT_THERMAL';
  message: string;
  deviceName?: string;
}

class ThermalPrinterService {
  private activeCharacteristic: any = null;
  private connectedDeviceName: string | null = null;

  /**
   * Checks if native Web Bluetooth API is accessible in the current browser or runtime
   */
  public isWebBluetoothSupported(): boolean {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      return true;
    }
    return false;
  }

  /**
   * Prompts user to select and pair a nearby Bluetooth Thermal Printer
   */
  public async connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      return {
        success: false,
        error: 'Web Bluetooth is not supported on this platform. Will use Native Thermal Print.',
      };
    }

    try {
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        filters: [
          { services: BLUETOOTH_PRINT_SERVICES },
          { namePrefix: 'MPT' },
          { namePrefix: 'POS' },
          { namePrefix: 'RPP' },
          { namePrefix: 'InnerPrinter' },
          { namePrefix: 'Printer' },
          { namePrefix: 'Bluetooth' },
        ],
        optionalServices: [
          ...BLUETOOTH_PRINT_SERVICES,
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
        ],
      });

      if (!device || !device.gatt) {
        throw new Error('Bluetooth device or GATT server not found.');
      }

      const server = await device.gatt.connect();

      // Find primary print service
      let targetService: any = null;
      for (const uuid of BLUETOOTH_PRINT_SERVICES) {
        try {
          targetService = await server.getPrimaryService(uuid);
          if (targetService) break;
        } catch {
          // Continue scanning services
        }
      }

      if (!targetService) {
        // Fallback: try getting all primary services and look for writable characteristic
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          const writable = chars.find(
            (c: any) => c.properties.writeWithoutResponse || c.properties.write
          );
          if (writable) {
            targetService = s;
            this.activeCharacteristic = writable;
            break;
          }
        }
      }

      if (!this.activeCharacteristic && targetService) {
        const characteristics = await targetService.getCharacteristics();
        this.activeCharacteristic = characteristics.find(
          (c: any) => c.properties.writeWithoutResponse || c.properties.write
        );
      }

      if (!this.activeCharacteristic) {
        throw new Error('Could not find writable printer characteristic on Bluetooth device.');
      }

      this.connectedDeviceName = (device.name as string) || 'Bluetooth Printer';
      await AsyncStorage.setItem(STORAGE_KEY_LAST_BT_DEVICE, this.connectedDeviceName || '');

      return { success: true, deviceName: this.connectedDeviceName || undefined };
    } catch (err: any) {
      this.activeCharacteristic = null;
      this.connectedDeviceName = null;
      return { success: false, error: err.message || 'Bluetooth connection cancelled or failed.' };
    }
  }

  /**
   * Sends raw ESC/POS byte buffer to Bluetooth thermal printer in safe chunks
   */
  public async writeRawBytesToBluetooth(bytes: Uint8Array): Promise<boolean> {
    if (!this.activeCharacteristic) {
      throw new Error('Bluetooth printer not connected.');
    }

    const CHUNK_SIZE = 128; // Safe MTU size for 58mm/80mm Bluetooth chips
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const slice = bytes.slice(offset, offset + CHUNK_SIZE);
      if (this.activeCharacteristic.writeValueWithoutResponse) {
        await this.activeCharacteristic.writeValueWithoutResponse(slice);
      } else {
        await this.activeCharacteristic.writeValue(slice);
      }
      // Small pause to allow thermal print head buffer to catch up
      await new Promise((res) => setTimeout(res, 20));
    }
    return true;
  }

  /**
   * Generates a thermal-styled HTML receipt formatted for 58mm or 80mm paper rolls
   */
  public buildThermalHtml(data: ThermalReceiptData, width: PaperWidth = '58mm'): string {
    const is80 = width === '80mm';
    const paperPx = is80 ? '288px' : '204px'; // 58mm ~ 204px at 203 DPI, 80mm ~ 288px
    const storeName = (data.storeName || 'DIGI HISAB KAROBAR').toUpperCase();
    const receiptNo = data.receiptNo || `RCP-${Date.now().toString().slice(-6)}`;
    const dateStr =
      data.dateStr ||
      new Date().toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

    const itemsHtml =
      data.items && data.items.length > 0
        ? data.items
            .map(
              (item) => `
          <tr>
            <td style="text-align: left; padding: 3px 0; word-break: break-word;">${item.name}</td>
            <td style="text-align: center; padding: 3px 4px;">${item.quantity}</td>
            <td style="text-align: right; padding: 3px 0;">Rs ${item.total.toLocaleString()}</td>
          </tr>`
            )
            .join('')
        : `
          <tr>
            <td style="text-align: left; padding: 3px 0;">Counter Cash Sale</td>
            <td style="text-align: center; padding: 3px 4px;">1</td>
            <td style="text-align: right; padding: 3px 0;">Rs ${(data.grandTotal || 0).toLocaleString()}</td>
          </tr>`;

    const raastQrUrl = data.raastQrData
      ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data.raastQrData)}`
      : data.raastId
      ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`raast://${data.raastId}?amt=${data.grandTotal}`)}`
      : null;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Kacha Parcha - ${receiptNo}</title>
        <style>
          @page {
            size: ${width} auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 8px 6px;
            font-family: 'Courier New', Courier, monospace, 'Noto Sans', sans-serif;
            font-size: 11px;
            color: #000000;
            background: #ffffff;
            width: ${paperPx};
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 15px; font-weight: 900; margin: 3px 0; letter-spacing: 0.5px; }
          .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-bottom: 2px double #000; margin: 6px 0; }
          .flex-row { display: flex; justify-content: space-between; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          th { border-bottom: 1px dashed #000; font-weight: bold; padding: 3px 0; }
          .grand-total { font-size: 14px; font-weight: 900; }
          .footer { font-size: 9.5px; margin-top: 8px; text-align: center; }
          .qr-box { text-align: center; margin: 6px 0; }
          .qr-box img { width: 110px; height: 110px; }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 9px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <div class="center title">${storeName}</div>
        ${data.storeTagline ? `<div class="center" style="font-size: 9px;">${data.storeTagline}</div>` : ''}
        ${data.storeAddress ? `<div class="center" style="font-size: 9.5px;">${data.storeAddress}</div>` : ''}
        ${data.storePhone ? `<div class="center" style="font-size: 9.5px;">Tel: ${data.storePhone}</div>` : ''}
        ${data.ntn ? `<div class="center" style="font-size: 9px;">NTN: ${data.ntn}</div>` : ''}

        <div class="double-divider"></div>
        <div class="center bold" style="font-size: 12px; letter-spacing: 1px;">KACHA PARCHA / کچا پرچہ</div>
        <div class="divider"></div>

        <div class="flex-row"><span>Receipt #:</span><span class="bold">${receiptNo}</span></div>
        <div class="flex-row"><span>Date:</span><span>${dateStr}</span></div>
        ${data.cashierName ? `<div class="flex-row"><span>Cashier:</span><span>${data.cashierName}</span></div>` : ''}
        ${data.customerName ? `<div class="flex-row"><span>Gahak:</span><span class="bold">${data.customerName}</span></div>` : ''}
        ${data.customerPhone ? `<div class="flex-row"><span>Phone:</span><span>${data.customerPhone}</span></div>` : ''}
        ${data.paymentMode ? `<div class="flex-row"><span>Mode:</span><span>${data.paymentMode}</span></div>` : ''}

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">ITEM</th>
              <th style="text-align: center;">QTY</th>
              <th style="text-align: right;">AMT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        ${
          data.subtotal && data.subtotal !== data.grandTotal
            ? `<div class="flex-row"><span>Subtotal:</span><span>Rs ${data.subtotal.toLocaleString()}</span></div>`
            : ''
        }
        ${
          data.discountAmount && data.discountAmount > 0
            ? `<div class="flex-row"><span>Discount (رعایت):</span><span>- Rs ${data.discountAmount.toLocaleString()}</span></div>`
            : ''
        }

        <div class="double-divider"></div>
        <div class="flex-row grand-total">
          <span>TOTAL:</span>
          <span>Rs ${data.grandTotal.toLocaleString()}</span>
        </div>
        <div class="double-divider"></div>

        ${
          data.amountPaid !== undefined && data.amountPaid > 0
            ? `<div class="flex-row"><span>Wasool (Paid):</span><span>Rs ${data.amountPaid.toLocaleString()}</span></div>`
            : ''
        }
        ${
          data.changeDue !== undefined && data.changeDue > 0
            ? `<div class="flex-row"><span>Baqaya (Change):</span><span>Rs ${data.changeDue.toLocaleString()}</span></div>`
            : ''
        }
        ${
          data.remainingBalance !== undefined && data.remainingBalance > 0
            ? `<div class="flex-row bold" style="color: #c00;"><span>Baqaya Khata (Due):</span><span>Rs ${data.remainingBalance.toLocaleString()}</span></div>`
            : ''
        }

        ${
          raastQrUrl
            ? `
          <div class="divider"></div>
          <div class="qr-box">
            <div class="bold" style="font-size: 10px;">RAAST INSTANT PAY</div>
            <img src="${raastQrUrl}" alt="Raast QR" />
            <div style="font-size: 8.5px;">Scan via JazzCash / Easypaisa</div>
          </div>
        `
            : ''
        }

        <div class="divider"></div>
        <div class="footer">
          <div class="bold">*** شُکریہ تشریف آوری کا ***</div>
          <div style="margin-top: 2px;">(تبدیلی 3 دن کے اندر بل کے ہمراہ ممکن ہے)</div>
          <div style="font-size: 8px; margin-top: 4px; color: #555;">Software: Digi Hisab (khata.ai)</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Main Print Dispatcher:
   * 1. Attempts direct raw ESC/POS byte streaming via Bluetooth GATT if connected or available.
   * 2. Automatically falls back to Expo-Print thermal slip without showing native build errors.
   */
  public async printReceipt(
    data: ThermalReceiptData,
    options: { paperWidth?: PaperWidth; openDrawer?: boolean; forceNativePrint?: boolean } = {}
  ): Promise<PrintResult> {
    const paperWidth = options.paperWidth || '58mm';

    // 1. Direct Web Bluetooth Byte Stream attempt (if paired and not forced to native print)
    if (!options.forceNativePrint && this.activeCharacteristic) {
      try {
        const rawBytes = buildPakistaniThermalReceipt(data, {
          paperWidth,
          openDrawer: options.openDrawer,
          cutPaper: true,
        });
        await this.writeRawBytesToBluetooth(rawBytes);
        return {
          success: true,
          transport: 'BLUETOOTH_RAW',
          deviceName: this.connectedDeviceName || 'Bluetooth Thermal Printer',
          message: `Kacha Parcha printed directly to ${this.connectedDeviceName || 'Bluetooth Printer'}.`,
        };
      } catch (btErr: any) {
        console.warn('Direct Bluetooth print stream error, falling back to Expo-Print:', btErr);
        // Fall through to Expo-Print
      }
    }

    // 2. High-performance Thermal HTML Print (Expo-Print)
    try {
      const html = this.buildThermalHtml(data, paperWidth);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 350);
          return {
            success: true,
            transport: 'EXPO_PRINT_THERMAL',
            message: 'Thermal receipt sent to printer preview.',
          };
        }
      }

      await Print.printAsync({
        html,
        printerUrl: undefined, // Default system or paired Bluetooth service
      });

      return {
        success: true,
        transport: 'EXPO_PRINT_THERMAL',
        message: 'Kacha Parcha sent to thermal printer.',
      };
    } catch (err: any) {
      return {
        success: false,
        transport: 'EXPO_PRINT_THERMAL',
        message: err.message || 'Thermal printing failed.',
      };
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService();
export default thermalPrinterService;
