import React, { useState, useEffect } from 'react';
import { KametiCommitteeModal } from './KametiCommitteeModal';
import { UtilityBillsTrackerModal } from './UtilityBillsTrackerModal';

export interface KametiBillsHubModalProps {
  visible: boolean;
  onClose: () => void;
  defaultSegment?: 'KAMETI' | 'SUB_METER';
  onShowToast?: (message: string) => void;
}

export const KametiBillsHubModal: React.FC<KametiBillsHubModalProps> = ({
  visible,
  onClose,
  defaultSegment = 'KAMETI',
  onShowToast,
}) => {
  const [activeSegment, setActiveSegment] = useState<'KAMETI' | 'SUB_METER'>(defaultSegment);

  useEffect(() => {
    if (visible) {
      setActiveSegment(defaultSegment);
    }
  }, [visible, defaultSegment]);

  return (
    <>
      <KametiCommitteeModal
        visible={visible && activeSegment === 'KAMETI'}
        onClose={onClose}
        onShowToast={onShowToast}
        segmentedHubMode={true}
        currentHubSegment={activeSegment}
        onSwitchHubSegment={setActiveSegment}
      />
      <UtilityBillsTrackerModal
        visible={visible && activeSegment === 'SUB_METER'}
        onClose={onClose}
        onShowToast={onShowToast}
        segmentedHubMode={true}
        currentHubSegment={activeSegment}
        onSwitchHubSegment={setActiveSegment}
      />
    </>
  );
};
