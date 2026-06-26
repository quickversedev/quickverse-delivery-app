import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileHeader from '../components/new-home/ProfileHeader';
import TodayPerformanceCard from '../components/new-home/TodayPerformanceCard';
import CashAccountabilityCard from '../components/new-home/CashAccountabilityCard';
import ActiveOrdersSection from '../components/new-home/ActiveOrdersSection';
import BottomStatsRow from '../components/new-home/BottomStatsRow';
import type { ActiveOrder } from '../components/new-home/ActiveOrdersSection';

const STATIC_ORDERS: ActiveOrder[] = [
  {
    orderId: 'ORD-7821',
    customerName: 'Priya Sharma',
    distance: '1.2 km',
    duration: '12 min',
    paymentType: 'COD',
    amount: 350,
    status: 'transit',
  },
  {
    orderId: 'ORD-7822',
    customerName: 'Amit Deshmukh',
    distance: '2.4 km',
    duration: '18 min',
    paymentType: 'UPI',
    amount: 240,
    status: 'pickup',
  },
  {
    orderId: 'ORD-7823',
    customerName: 'Neha Patil',
    distance: '1.8 km',
    duration: '14 min',
    paymentType: 'PREPAID',
    amount: 180,
    status: 'arriving',
  },
];

const NewHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(true);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileHeader
          name="Rajan Kumar"
          id="RK7821"
          type="Full Time"
          isOnline={isOnline}
          onToggleOnline={setIsOnline}
        />

        <View style={styles.spacer} />
        <TodayPerformanceCard
          earningsToday={850}
          ordersDone={8}
          ordersTarget={20}
          rating={4.8}
          riderTier="Silver Rider"
          xp={2340}
          xpToNext={660}
          nextTier="Gold"
          progressPercent={78}
        />

        <View style={styles.spacer} />
        <CashAccountabilityCard
          collected={8250}
          deposited={6450}
          cashInHand={1800}
          settlementStatus="No Issues"
          hasIssues={false}
        />

        <View style={styles.spacer} />
        <ActiveOrdersSection orders={STATIC_ORDERS} />

        <View style={styles.spacer} />
        <BottomStatsRow
          successCount={8}
          failedCount={0}
          totalDistance={24.3}
        />

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  spacer: {
    height: 14,
  },
});

export default NewHomeScreen;
