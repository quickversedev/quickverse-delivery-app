import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsChartV3 } from '../../types/earnings';

type Props = { data: EarningsChartV3 };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Chart constants ──────────────────────────────────────────────────────────
const CARD_PADDING = 18;
const CHART_WIDTH = SCREEN_WIDTH - 32 - CARD_PADDING * 2; // card: 16 margin each side
const CHART_HEIGHT = 120;
const PAD_TOP = 28;    // space above line for amount labels
const PAD_BOTTOM = 24; // space below line for day labels
const SVG_HEIGHT = CHART_HEIGHT + PAD_TOP + PAD_BOTTOM;
const DOT_R = 4;
const DOT_R_SELECTED = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatAmount = (v: number): string => {
  if (v >= 1000) { return `₹${(v / 1000).toFixed(1)}k`; }
  return `₹${v}`;
};

// Build SVG smooth path through points
const buildSmoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length < 2) { return ''; }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
};

// ─── Component ────────────────────────────────────────────────────────────────
const Last7DaysChart: React.FC<Props> = ({ data }) => {
  const { totalAmount, chartData } = data;

  // Default selected = last item (today)
  const defaultIndex = chartData.length > 0 ? chartData.length - 1 : 0;
  const [selectedIndex, setSelectedIndex] = useState<number>(defaultIndex);

  // Compute chart points
  const points = useMemo(() => {
    if (chartData.length === 0) { return []; }
    const max = Math.max(...chartData.map(d => d.amount), 1);
    const step = CHART_WIDTH / Math.max(chartData.length - 1, 1);
    return chartData.map((d, i) => ({
      x: i === 0 ? 0 : i * step,
      y: PAD_TOP + CHART_HEIGHT - (d.amount / max) * CHART_HEIGHT * 0.88,
      amount: d.amount,
      day: d.day,
    }));
  }, [chartData]);

  const linePath = buildSmoothPath(points);

  // Area path under the line (gradient fill)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${PAD_TOP + CHART_HEIGHT} L 0 ${PAD_TOP + CHART_HEIGHT} Z`
    : '';

  // Handle tap on chart
  const handleChartPress = (evt: any) => {
    if (points.length === 0) { return; }
    const tapX = evt.nativeEvent.locationX - CARD_PADDING;
    let closestIndex = 0;
    let minDist = Infinity;
    points.forEach((pt, i) => {
      const dist = Math.abs(pt.x - tapX);
      if (dist < minDist) { minDist = dist; closestIndex = i; }
    });
    setSelectedIndex(closestIndex);
  };

  const isEmpty = chartData.length === 0;

  return (
    <View style={styles.card}>
      {/* ── Card header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>LAST 7 DAYS EARNINGS</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Total: </Text>
          <Text style={styles.totalAmount}>
            ₹{totalAmount.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={handleChartPress}>
          <View style={[styles.chartArea, { width: CHART_WIDTH + CARD_PADDING * 2 }]}>
            <Svg
              width={CHART_WIDTH}
              height={SVG_HEIGHT}
              style={{ overflow: 'visible', marginLeft: 0 }}
            >
              <Defs>
                {/* Gradient fill under line */}
                <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#1D6BFC" stopOpacity="0.15" />
                  <Stop offset="1" stopColor="#1D6BFC" stopOpacity="0.01" />
                </LinearGradient>
              </Defs>

              {/* Area fill */}
              <Path d={areaPath} fill="url(#lineGrad)" />

              {/* Line */}
              <Path
                d={linePath}
                stroke="#1D6BFC"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical dashed guide line for selected point */}
              {points[selectedIndex] && (
                <Line
                  x1={points[selectedIndex].x}
                  y1={PAD_TOP}
                  x2={points[selectedIndex].x}
                  y2={PAD_TOP + CHART_HEIGHT}
                  stroke="#1D6BFC"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  strokeOpacity={0.4}
                />
              )}

              {/* Data points */}
              {points.map((pt, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <React.Fragment key={chartData[i].day}>
                    {/* Outer glow ring for selected */}
                    {isSelected && (
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={DOT_R_SELECTED + 4}
                        fill="#1D6BFC"
                        fillOpacity={0.12}
                      />
                    )}
                    {/* Dot */}
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? DOT_R_SELECTED : DOT_R}
                      fill={isSelected ? '#1D6BFC' : '#FFFFFF'}
                      stroke="#1D6BFC"
                      strokeWidth={2}
                    />
                    {/* Amount label above dot */}
                    <SvgText
                      x={pt.x}
                      y={pt.y - (isSelected ? DOT_R_SELECTED : DOT_R) - 6}
                      fontSize={isSelected ? 12 : 10}
                      fontWeight={isSelected ? '700' : '500'}
                      fill={isSelected ? '#1D6BFC' : '#94A3B8'}
                      textAnchor="middle"
                    >
                      {formatAmount(pt.amount)}
                    </SvgText>
                    {/* Day label below chart */}
                    <SvgText
                      x={pt.x}
                      y={PAD_TOP + CHART_HEIGHT + 18}
                      fontSize={11}
                      fontWeight={isSelected ? '700' : '400'}
                      fill={isSelected ? '#1D6BFC' : '#94A3B8'}
                      textAnchor="middle"
                    >
                      {chartData[i].day}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: CARD_PADDING,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.6,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#1D6BFC',
  },
  totalAmount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },
  chartArea: {
    alignItems: 'flex-start',
  },
  emptyWrap: {
    height: SVG_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#CBD5E1',
  },
});

export default Last7DaysChart;
