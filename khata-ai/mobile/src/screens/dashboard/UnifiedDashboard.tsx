import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { ProfileDrawer } from '../../components/ProfileDrawer';
import { HouseholdView } from './HouseholdView';
import { VendorView } from './VendorView';
import { useAuth } from '../../store/auth.store';
import { COLORS } from '../../theme/colors';

interface Props {
  navigation: any;
}

export const UnifiedDashboard: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { activePersona } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);

  const handleNavigateTab = (tabIndex: number) => {
    navigation.navigate('ProfileManagement', { initialTab: tabIndex });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Shared Global Top Header with Logo & Persona Switcher */}
      <Header
        activeMode={activePersona === 'HOUSEHOLD' ? 'GHAR' : 'DUKAN'}
        onOpenProfileDrawer={() => setDrawerVisible(true)}
      />

      {/* Profile Sidebar Drawer */}
      <ProfileDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigateTab={handleNavigateTab}
      />

      {/* Swappable Dedicated Views */}
      <View style={styles.contentArea}>
        {activePersona === 'HOUSEHOLD' ? <HouseholdView /> : <VendorView />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
  contentArea: {
    flex: 1,
  },
});
