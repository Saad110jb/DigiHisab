import React from 'react';
import { StockManagementModal } from './StockManagementModal';

interface StockAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onStockUpdated?: () => void;
  onOpenWholesalePo?: (item?: any, quantity?: number) => void;
}

export const StockAlertModal: React.FC<StockAlertModalProps> = ({
  visible,
  onClose,
  onStockUpdated,
  onOpenWholesalePo,
}) => {
  return (
    <StockManagementModal
      visible={visible}
      onClose={onClose}
      initialTab="ALERTS"
      onStockUpdated={onStockUpdated}
      onOpenWholesalePo={onOpenWholesalePo}
    />
  );
};
