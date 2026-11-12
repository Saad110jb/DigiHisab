/**
 * Digi Hisab - Continuous High-Velocity Camera Barcode Hardware Stream
 *
 * Continuous 60fps camera viewfinder scanning that reads EAN13, EAN8, UPC_A, Code128, and QR codes,
 * plays a supermarket audio beep + haptic vibration, and buffers items into a floating cart accumulator.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inventoryApi, IInventoryItem } from '../api/inventory.api';

export interface ScannedCartItem {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  inventoryItemId?: string;
  unitOfMeasure?: string;
}

interface ContinuousBarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckout: (items: ScannedCartItem[], totalAmount: number) => void;
  inventoryList?: IInventoryItem[];
}

export const ContinuousBarcodeScannerModal: React.FC<ContinuousBarcodeScannerModalProps> = ({
  visible,
  onClose,
  onCheckout,
  inventoryList: propInventoryList,
}) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cartItems, setCartItems] = useState<ScannedCartItem[]>([]);
  const [lastScanned, setLastScanned] = useState<{ name: string; barcode: string; price: number } | null>(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [inventory, setInventory] = useState<IInventoryItem[]>(propInventoryList || []);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Debounce history tracker (prevents re-scanning the same barcode within 1200ms)
  const scannedHistoryRef = useRef<Map<string, number>>(new Map());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Animate laser guide continuously
  useEffect(() => {
    if (!visible) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible]);

  // Fetch store inventory for live barcode-to-product matching if not provided
  useEffect(() => {
    if (visible && (!inventory || inventory.length === 0)) {
      setLoadingInventory(true);
      inventoryApi
        .getAll()
        .then((res) => {
          if (res.success && res.data) {
            setInventory(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInventory(false));
    }
  }, [visible]);

  // Reset cart when modal is closed
  useEffect(() => {
    if (!visible) {
      setCartItems([]);
      setLastScanned(null);
      setShowCartDrawer(false);
      scannedHistoryRef.current.clear();
    }
  }, [visible]);

  /**
   * Supermarket Beep (Web Audio Synthesizer + Haptic Feedback)
   */
  const triggerAudioHapticFeedback = () => {
    try {
      // 1. Haptic Vibration
      Vibration.vibrate(80);

      // 2. Audible 1850Hz Supermarket Cash Register Beep
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1850, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }
      }
    } catch {
      // Ignore audio synthesis errors on restricted platforms
    }
  };

  /**
   * Barcode Scanned Handler with 1.2s Debounce & Cart Accumulator Buffer
   */
  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const rawBarcode = result.data?.trim();
    if (!rawBarcode) return;

    const now = Date.now();
    const lastScannedTime = scannedHistoryRef.current.get(rawBarcode) || 0;

    // Debounce check: Ignore if this exact barcode was scanned in the last 1200ms
    if (now - lastScannedTime < 1200) {
      return;
    }
    scannedHistoryRef.current.set(rawBarcode, now);

    // Audio & Haptic confirmation
    triggerAudioHapticFeedback();

    // Visual Flash Animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    // Match against inventory
    const matchedItem = inventory.find(
      (item) =>
        (item.sku && item.sku.toLowerCase() === rawBarcode.toLowerCase()) ||
        (item._id && item._id === rawBarcode) ||
        (item.itemName && item.itemName.toLowerCase() === rawBarcode.toLowerCase())
    );

    const itemName = matchedItem ? matchedItem.itemName : `Item #${rawBarcode.slice(-4)}`;
    const unitPrice = matchedItem ? matchedItem.retailPrice : 100;
    const invId = matchedItem ? matchedItem._id : undefined;
    const uom = matchedItem?.unitOfMeasure || 'pcs';

    setLastScanned({ name: itemName, barcode: rawBarcode, price: unitPrice });

    // Update Cart Buffer
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.barcode === rawBarcode);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      } else {
        return [
          {
            barcode: rawBarcode,
            name: itemName,
            price: unitPrice,
            quantity: 1,
            inventoryItemId: invId,
            unitOfMeasure: uom,
          },
          ...prev,
        ];
      }
    });
  };

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleDoneAndCharge = () => {
    if (cartItems.length === 0) {
      onClose();
      return;
    }
    onCheckout(cartItems, totalCartAmount);
    onClose();
  };

  const handleUpdateItemQty = (barcode: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.barcode === barcode) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ScannedCartItem[]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Permission Check */}
        {!permission?.granted ? (
          <View style={[styles.permissionBox, { paddingTop: insets.top + 40 }]}>
            <Ionicons name="camera-outline" size={64} color="#00D2B4" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              Digi Hisab needs camera permissions to enable rapid continuous barcode scanning for grocery items.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            {/* Live Camera View */}
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128', 'qr'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Top HUD Controls */}
            <View style={[styles.topHeader, { top: insets.top + 10 }]}>
              <TouchableOpacity style={styles.iconCircle} onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerTitleBox}>
                <Text style={styles.hudTitle}>Rapid Scanner (60 FPS)</Text>
                <Text style={styles.hudSubtitle}>
                  {loadingInventory ? 'Loading inventory...' : 'Point at any grocery barcode'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.iconCircle, torchEnabled && styles.iconCircleActive]}
                onPress={() => setTorchEnabled(!torchEnabled)}
              >
                <Ionicons name={torchEnabled ? 'flash' : 'flash-off'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Viewfinder Target Reticle with Animated Laser Line */}
            <View style={styles.reticleContainer}>
              <View style={styles.reticleBox}>
                {/* Corner Accents */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated Red Laser Scan Line */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [
                        {
                          translateY: laserAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 200],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>

            {/* Floating Last Scanned Notification Card */}
            {lastScanned && (
              <Animated.View style={[styles.lastScannedCard, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastScannedName} numberOfLines={1}>
                    {lastScanned.name}
                  </Text>
                  <Text style={styles.lastScannedMeta}>
                    Barcode: {lastScanned.barcode} • Rs. {lastScanned.price.toLocaleString()}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Floating Mini-Cart Bottom Pill */}
            <View style={[styles.bottomTray, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {/* Expandable Cart Drawer (if opened) */}
              {showCartDrawer && (
                <View style={styles.drawerSheet}>
                  <View style={styles.drawerHeader}>
                    <Text style={styles.drawerTitle}>Scanned Items ({cartItems.length})</Text>
                    <TouchableOpacity onPress={() => setShowCartDrawer(false)}>
                      <Ionicons name="chevron-down" size={22} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.drawerList} nestedScrollEnabled>
                    {cartItems.map((item) => (
                      <View key={item.barcode} style={styles.cartRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cartItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.cartItemPrice}>
                            Rs. {item.price.toLocaleString()} each
                          </Text>
                        </View>
                        <View style={styles.qtyControl}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleUpdateItemQty(item.barcode, -1)}
                          >
                            <Ionicons name="remove" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleUpdateItemQty(item.barcode, 1)}
                          >
                            <Ionicons name="add" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Main Sticky Pill Action Bar */}
              <View style={styles.cartPillContainer}>
                <TouchableOpacity
                  style={styles.cartSummarySection}
                  onPress={() => setShowCartDrawer(!showCartDrawer)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cartBadge}>
                    <Ionicons name="cart" size={18} color="#0B2239" />
                    <Text style={styles.cartBadgeText}>{totalItemsCount}</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.cartAmountText}>
                      PKR {totalCartAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.cartItemsCountText}>
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in cart
                    </Text>
                  </View>
                  <Ionicons
                    name={showCartDrawer ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color="#94A3B8"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

                {/* Done & Charge Button */}
                <TouchableOpacity
                  style={[styles.chargeBtn, cartItems.length === 0 && styles.chargeBtnDisabled]}
                  onPress={handleDoneAndCharge}
                  disabled={cartItems.length === 0}
                  activeOpacity={0.85}
                >
                  <Text style={styles.chargeBtnText}>Done & Charge Galla</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0B2239" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionBox: {
    flex: 1,
    backgroundColor: '#0B2239',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },
  permissionDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#00D2B4',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#0B2239',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  topHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 34, 57, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconCircleActive: {
    backgroundColor: '#00D2B4',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudSubtitle: {
    color: '#00D2B4',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  reticleBox: {
    width: 270,
    height: 210,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00D2B4',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  laserLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  lastScannedCard: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(11, 34, 57, 0.92)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00D2B4',
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  lastScannedName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  lastScannedMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  bottomTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 30,
  },
  drawerSheet: {
    backgroundColor: '#0B2239',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    maxHeight: 220,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 180, 0.3)',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  drawerList: {
    maxHeight: 160,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cartItemName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cartItemPrice: {
    color: '#00D2B4',
    fontSize: 11,
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122E48',
    borderRadius: 8,
    padding: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  qtyText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginHorizontal: 10,
  },
  cartPillContainer: {
    backgroundColor: 'rgba(11, 34, 57, 0.95)',
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 180, 0.5)',
    shadowColor: '#00D2B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cartSummarySection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00D2B4',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadgeText: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  cartAmountText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  cartItemsCountText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  chargeBtn: {
    backgroundColor: '#00D2B4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeBtnDisabled: {
    backgroundColor: '#64748B',
    opacity: 0.5,
  },
  chargeBtnText: {
    color: '#0B2239',
    fontSize: 13,
    fontWeight: '800',
  },
});
