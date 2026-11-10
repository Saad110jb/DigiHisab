import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { useAuth } from '../store/auth.store';

interface MalikStepUpModalProps {
  visible: boolean;
  title: string;
  description: string;
  actionName: string;
  onSuccess: (stepUpToken: string) => void;
  onCancel: () => void;
}

export const MalikStepUpModal: React.FC<MalikStepUpModalProps> = ({
  visible,
  title,
  description,
  actionName,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!visible) return null;

  const isHousehold = user?.activePersona === 'HOUSEHOLD';

  const handleVerify = async () => {
    if (!pin || pin.trim().length < 4) {
      setErrorMsg('براہ کرم درست 4 ہندسوں کا سیکیورٹی پن درج کریں۔');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post('/auth/step-up', {
        credential: pin.trim(),
        type: 'PIN',
        actionName,
      });

      if (res.data?.success && res.data?.stepUpToken) {
        setPin('');
        onSuccess(res.data.stepUpToken);
      } else {
        setErrorMsg(res.data?.message || 'غلط سیکیورٹی پن۔ دوبارہ کوشش کریں۔');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'تصدیق میں دشواری پیش آئی۔';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={26} color="#00d49f" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {isHousehold ? 'سربراہ کا سیکیورٹی پن (Family Head PIN)' : 'مالک کا ماسٹر پن (Malik Master PIN)'}
            </Text>
            <TextInput
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor="#64748b"
              value={pin}
              onChangeText={(val) => {
                setPin(val);
                setErrorMsg(null);
              }}
              style={styles.input}
            />
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#f43f5e" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelBtnText}>منسوخ کریں</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.disabledBtn]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#070d18" />
              ) : (
                <Text style={styles.confirmBtnText}>تصدیق کریں (Authorize)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0d1627',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 11,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00d49f',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
