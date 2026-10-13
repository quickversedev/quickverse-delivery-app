import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../theme/typography';

const OrdersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Orders</Text>
      <View style={styles.center}>
        <Package size={48} color="#C7D7FE" strokeWidth={1.5} />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>Order management will be available here</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  header: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    textAlign: 'center',
    paddingVertical: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  title: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#334155',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
});

export default OrdersScreen;
