import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

type OrderStatus = 'pickup' | 'transit' | 'arriving' | 'delivered';

type ActiveOrder = {
  orderId: string;
  customerName: string;
  distance: string;
  duration: string;
  paymentType: 'COD' | 'UPI' | 'PREPAID';
  amount: number;
  status: OrderStatus;
};

type Props = {
  orders: ActiveOrder[];
  onViewAll?: () => void;
};

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  COD: { bg: '#FEF3C7', text: '#92400E' },
  UPI: { bg: '#EDE9FE', text: '#6D28D9' },
  PREPAID: { bg: '#D1FAE5', text: '#065F46' },
};

const STATUS_STEPS: OrderStatus[] = ['pickup', 'transit', 'arriving', 'delivered'];

const STATUS_COLORS: Record<string, string> = {
  completed: '#16A34A',
  current: '#F59E0B',
  pending: '#E2E8F0',
};

const ProgressDots: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <View style={styles.progressContainer}>
      {STATUS_STEPS.map((step, i) => {
        let color: string;
        if (i < currentIndex) {
          color = STATUS_COLORS.completed;
        } else if (i === currentIndex) {
          color = STATUS_COLORS.current;
        } else {
          color = STATUS_COLORS.pending;
        }

        return (
          <React.Fragment key={step}>
            <View style={[styles.progressDot, { backgroundColor: color }]} />
            {i < STATUS_STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor:
                      i < currentIndex
                        ? STATUS_COLORS.completed
                        : STATUS_COLORS.pending,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const OrderCard: React.FC<{ order: ActiveOrder }> = ({ order }) => {
  const paymentColor = PAYMENT_COLORS[order.paymentType];

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdRow}>
          <Text style={styles.orderId}>#{order.orderId}</Text>
          <View
            style={[styles.paymentBadge, { backgroundColor: paymentColor.bg }]}
          >
            <Text style={[styles.paymentText, { color: paymentColor.text }]}>
              {order.paymentType}
            </Text>
          </View>
        </View>
        <Text style={styles.orderAmount}>
          ₹{order.amount}
        </Text>
      </View>

      <Text style={styles.customerName}>{order.customerName}</Text>

      <View style={styles.orderFooter}>
        <View style={styles.distanceRow}>
          <MapPin size={12} color="#94A3B8" />
          <Text style={styles.distanceText}>
            {order.distance} • {order.duration}
          </Text>
        </View>
        <ProgressDots status={order.status} />
      </View>
    </View>
  );
};

const ActiveOrdersSection: React.FC<Props> = ({ orders, onViewAll }) => (
  <View style={styles.container}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>ACTIVE ORDERS ({orders.length})</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View All &rsaquo;</Text>
        </TouchableOpacity>
      )}
    </View>

    {orders.map(order => (
      <OrderCard key={order.orderId} order={order} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  customerName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    width: 20,
    height: 2,
  },
});

export default ActiveOrdersSection;
export type { ActiveOrder };
