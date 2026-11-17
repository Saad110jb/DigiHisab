import React, { useState, useEffect } from 'react';
import { CashflowHistoryModal } from './CashflowHistoryModal';
import { ChorNazarSentinelModal } from './ChorNazarSentinelModal';

export interface GallaAuditModalProps {
  visible: boolean;
  onClose: () => void;
  defaultSegment?: 'CASHFLOW' | 'SENTINEL';
  onOpenGallaBandi?: () => void;
}

export const GallaAuditModal: React.FC<GallaAuditModalProps> = ({
  visible,
  onClose,
  defaultSegment = 'CASHFLOW',
  onOpenGallaBandi,
}) => {
  const [activeSegment, setActiveSegment] = useState<'CASHFLOW' | 'SENTINEL'>(defaultSegment);

  useEffect(() => {
    if (visible) {
      setActiveSegment(defaultSegment);
    }
  }, [visible, defaultSegment]);

  return (
    <>
      <CashflowHistoryModal
        visible={visible && activeSegment === 'CASHFLOW'}
        onClose={onClose}
        segmentedAuditMode={true}
        currentAuditSegment={activeSegment}
        onSwitchAuditSegment={setActiveSegment}
      />
      <ChorNazarSentinelModal
        visible={visible && activeSegment === 'SENTINEL'}
        onClose={onClose}
        onOpenGallaBandi={onOpenGallaBandi}
        segmentedAuditMode={true}
        currentAuditSegment={activeSegment}
        onSwitchAuditSegment={setActiveSegment}
      />
    </>
  );
};
