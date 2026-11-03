import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DomesticDashboardHub } from '../../components/DomesticDashboardHub';

export const HouseholdView: React.FC = () => {
  return (
    <View style={styles.container}>
      <DomesticDashboardHub />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
});
