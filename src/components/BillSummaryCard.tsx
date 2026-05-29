import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, FileText, Info } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';

interface BillSummaryCardProps {
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeOriginal?: number;
  platformFee?: number;
  platformFeeOriginal?: number;
  packagingCharges?: number;
  packagingChargesOriginal?: number;
  taxes?: number;
  commission?: number;
  taxableAmount?: number;
  commissionRate?: number;
  gstRate?: number;
}

const formatAmount = (value: number) => `₹${value.toFixed(2)}`;

const BillSummaryCard: React.FC<BillSummaryCardProps> = ({
  totalAmount,
  subtotal,
  deliveryFee,
  deliveryFeeOriginal,
  platformFee = 0,
  platformFeeOriginal,
  packagingCharges = 0,
  packagingChargesOriginal,
  taxes = 0,
  commission = 0,
  taxableAmount = 0,
  commissionRate,
  gstRate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(prev => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <FileText size={18} color="#0E6DFD" />
          </View>
          <View>
            <Text style={styles.headerLabel}>Total Bill (Inc. Taxes & Charges)</Text>
            <Text style={styles.headerAmount}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.toggleText}>
            {isExpanded ? 'Hide' : 'View details'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={16} color="#0E6DFD" />
          ) : (
            <ChevronDown size={16} color="#0E6DFD" />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.breakdown}>
          <Text style={styles.sectionTitle}>BILL DETAILS</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Sub Total</Text>
            <Text style={styles.value}>{formatAmount(subtotal)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Delivery Fee</Text>
            <View style={styles.feeRow}>
              {deliveryFeeOriginal != null && deliveryFeeOriginal !== deliveryFee && (
                <Text style={styles.crossedText}>₹{deliveryFeeOriginal}</Text>
              )}
              <Text style={styles.value}>{formatAmount(deliveryFee)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Platform Fee</Text>
            <View style={styles.feeRow}>
              {platformFeeOriginal != null && platformFeeOriginal !== platformFee && (
                <Text style={styles.crossedText}>₹{platformFeeOriginal}</Text>
              )}
              <Text style={styles.value}>{formatAmount(platformFee)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Packaging Charges</Text>
            <View style={styles.feeRow}>
              {packagingChargesOriginal != null && packagingChargesOriginal !== packagingCharges && (
                <Text style={styles.crossedText}>₹{packagingChargesOriginal}</Text>
              )}
              <Text style={styles.value}>{formatAmount(packagingCharges)}</Text>
            </View>
          </View>

          {taxes > 0 && (
            <View>
              <Pressable
                style={styles.row}
                onPress={() => setShowTaxBreakdown(prev => !prev)}
              >
                <View style={styles.taxLabelRow}>
                  <Text style={styles.label}>Taxes (GST & Services)</Text>
                  <Info size={12} color="#64748B" style={styles.infoIcon} />
                </View>
                <Text style={styles.value}>{formatAmount(taxes)}</Text>
              </Pressable>

              {showTaxBreakdown && (
                <View style={styles.taxBreakdown}>
                  <Text style={styles.taxText}>
                    Commission ({commissionRate != null ? `${(commissionRate * 100).toFixed(0)}%` : '10%'}): {formatAmount(commission)}
                  </Text>
                  <Text style={styles.taxText}>
                    Delivery Fee: {formatAmount(deliveryFee)}
                  </Text>
                  <Text style={styles.taxText}>
                    Platform Fee: {formatAmount(platformFee)}
                  </Text>
                  <View style={styles.taxDivider} />
                  <Text style={styles.taxText}>
                    Taxable Amount: {formatAmount(taxableAmount)}
                  </Text>
                  <Text style={styles.taxTextBold}>
                    GST ({gstRate != null ? `${(gstRate * 100).toFixed(0)}%` : '18%'}): {formatAmount(taxes)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pay</Text>
            <Text style={styles.totalValue}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: FONT_FAMILY.outfitRegular,
    marginBottom: 2,
  },
  headerAmount: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    color: '#0E6DFD',
    fontFamily: FONT_FAMILY.outfitRegular,
  },
  breakdown: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONT_FAMILY.outfitRegular,
  },
  value: {
    fontSize: 13,
    color: '#0F172A',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crossedText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontFamily: FONT_FAMILY.outfitRegular,
  },
  taxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginLeft: 4,
  },
  taxBreakdown: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  taxText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: FONT_FAMILY.outfitRegular,
    lineHeight: 18,
  },
  taxTextBold: {
    fontSize: 11,
    color: '#0F172A',
    fontFamily: FONT_FAMILY.outfitBold,
    lineHeight: 18,
  },
  taxDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
});

export default BillSummaryCard;
