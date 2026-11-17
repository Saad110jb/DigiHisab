import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DomesticDashboardHub } from '../../components/DomesticDashboardHub';
import { FooterTabId } from '../../components/DualPersonaFooter';

export interface HouseholdViewProps {
  footerTab?: FooterTabId;
  onSelectFooterTab?: (tab: FooterTabId) => void;
}

export const HouseholdView: React.FC<HouseholdViewProps> = ({
  footerTab,
  onSelectFooterTab,
}) => {
  return (
    <View style={styles.container}>
      <DomesticDashboardHub
        footerTab={footerTab}
        onSelectFooterTab={onSelectFooterTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
});
