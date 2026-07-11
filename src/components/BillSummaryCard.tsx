import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp, FileText, Info } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';

type OrderFinance = {
  itemTotalAmount?: number;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  isFreeDelivery?: boolean;
  amountAfterCoupon?: number;
  packagingCharges?: number;
  actualDeliveryFee?: number;
  deliveryFee?: number;
  platformFee?: number;
  razorpayCharges?: number;
  serviceGstRate?: number;
  commissionGst?: number;
  deliveryGst?: number;
  packagingGst?: number;
  codGst?: number;
  platformGst?: number;
  totalGst?: number;
  taxableAmount?: number;
  payableAmount?: number;
  commissionRate?: number;
  commission?: number;
  paymentMethod?: string | null;
  codCharges?: number;
  createdAt?: string | number;
  updatedAt?: string | number | null;
};

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
  finance?: OrderFinance | null;
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
  finance = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // If `finance` is provided, prefer its values over the raw props.
  const effectiveSubtotal = finance?.itemTotalAmount ?? subtotal;
  const effectiveDeliveryFee =
    finance?.actualDeliveryFee ?? finance?.deliveryFee ?? deliveryFee;
  const effectivePlatformFee = finance?.platformFee ?? platformFee;
  const effectivePackagingCharges =
    finance?.packagingCharges ?? packagingCharges;
  const effectiveTaxes = finance?.totalGst ?? taxes;
  const effectiveCommission = finance?.commission ?? commission;
  const effectiveTaxableAmount = finance?.taxableAmount ?? taxableAmount;
  const effectiveCommissionRate = finance?.commissionRate ?? commissionRate;
  const effectiveGstRate = finance?.serviceGstRate ?? gstRate;
  const effectiveTotalAmount = finance?.payableAmount ?? totalAmount;

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
            <Text style={styles.headerLabel}>
              Total Bill (Inc. Taxes & Charges)
            </Text>
            <Text style={styles.headerAmount}>
              {formatAmount(effectiveTotalAmount)}
            </Text>
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

          {effectiveSubtotal > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Sub Total</Text>
              <Text style={styles.value}>
                {formatAmount(effectiveSubtotal)}
              </Text>
            </View>
          )}

          {effectiveDeliveryFee > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Delivery Fee</Text>
              <View style={styles.feeRow}>
                {deliveryFeeOriginal != null &&
                  deliveryFeeOriginal !== effectiveDeliveryFee && (
                    <Text style={styles.crossedText}>
                      ₹{deliveryFeeOriginal}
                    </Text>
                  )}
                <Text style={styles.value}>
                  {formatAmount(effectiveDeliveryFee)}
                </Text>
              </View>
            </View>
          )}

          {effectivePlatformFee > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Platform Fee</Text>
              <View style={styles.feeRow}>
                {platformFeeOriginal != null &&
                  platformFeeOriginal !== effectivePlatformFee && (
                    <Text style={styles.crossedText}>
                      ₹{platformFeeOriginal}
                    </Text>
                  )}
                <Text style={styles.value}>
                  {formatAmount(effectivePlatformFee)}
                </Text>
              </View>
            </View>
          )}

          {effectivePackagingCharges > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Packaging Charges</Text>
              <View style={styles.feeRow}>
                {packagingChargesOriginal != null &&
                  packagingChargesOriginal !== effectivePackagingCharges && (
                    <Text style={styles.crossedText}>
                      ₹{packagingChargesOriginal}
                    </Text>
                  )}
                <Text style={styles.value}>
                  {formatAmount(effectivePackagingCharges)}
                </Text>
              </View>
            </View>
          )}

          {effectiveTaxes > 0 && (
            <View>
              <Pressable
                style={styles.row}
                onPress={() => setShowTaxBreakdown(prev => !prev)}
              >
                <View style={styles.taxLabelRow}>
                  <Text style={styles.label}>Taxes (GST & Services)</Text>
                  <Info size={12} color="#64748B" style={styles.infoIcon} />
                </View>
                <Text style={styles.value}>{formatAmount(effectiveTaxes)}</Text>
              </Pressable>

              {showTaxBreakdown && (
                <View style={styles.taxBreakdown}>
                  {effectiveCommission > 0 && (
                    <Text style={styles.taxText}>
                      Commission (
                      {effectiveCommissionRate != null
                        ? `${(effectiveCommissionRate * 100).toFixed(0)}%`
                        : '10%'}
                      ): {formatAmount(effectiveCommission)}
                    </Text>
                  )}
                  {effectiveDeliveryFee > 0 && (
                    <Text style={styles.taxText}>
                      Delivery Fee: {formatAmount(effectiveDeliveryFee)}
                    </Text>
                  )}
                  {effectivePlatformFee > 0 && (
                    <Text style={styles.taxText}>
                      Platform Fee: {formatAmount(effectivePlatformFee)}
                    </Text>
                  )}
                  <View style={styles.taxDivider} />
                  {effectiveTaxableAmount > 0 && (
                    <Text style={styles.taxText}>
                      Taxable Amount: {formatAmount(effectiveTaxableAmount)}
                    </Text>
                  )}
                  <Text style={styles.taxTextBold}>
                    GST (
                    {effectiveGstRate != null
                      ? `${(effectiveGstRate * 100).toFixed(0)}%`
                      : '18%'}
                    ): {formatAmount(effectiveTaxes)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pay</Text>
            <Text style={styles.totalValue}>
              {formatAmount(effectiveTotalAmount)}
            </Text>
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
