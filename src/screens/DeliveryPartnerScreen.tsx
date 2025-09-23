import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { PartnerStatusStorage } from '../utils/storage';

interface DeliveryPartnerScreenProps {
  navigation: any;
}

const DeliveryPartnerScreen: React.FC<DeliveryPartnerScreenProps> = ({ navigation }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(PartnerStatusStorage.isActive());
  }, []);

  const toggleActive = (value: boolean) => {
    setIsActive(value);
    PartnerStatusStorage.setActive(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Partner</Text>
        <Text style={styles.subtitle}>Control your availability and view key info</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Active</Text>
          <Switch value={isActive} onValueChange={toggleActive} trackColor={{ true: '#34C759' }} />
        </View>
        <Text style={styles.helper}>
          {isActive ? 'You are available to receive deliveries' : 'You are offline'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0:00</Text>
            <Text style={styles.statLabel}>Online Time</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>₹0</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>View Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Payouts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
          <Text style={styles.actionText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 24 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666666', marginTop: 4 },
  card: { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  helper: { marginTop: 8, color: '#666666' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F8F8F8', borderRadius: 12, marginHorizontal: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#666666', marginTop: 4 },
  actions: { marginTop: 'auto', paddingVertical: 16 },
  actionButton: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default DeliveryPartnerScreen;



