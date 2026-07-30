import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { FONT_FAMILY } from '../../theme/typography';
import type { DailyEarning } from '../../types/earnings';

type Props = { data: DailyEarning[]; title?: string };

const CHART_HEIGHT = 160;
const BAR_RADIUS = 6;
const VALUE_HEIGHT = 18;

const WeeklyBarChart: React.FC<Props> = ({ data, title }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const barWidth = Math.min(28, (chartWidth - (data.length - 1) * 8) / data.length);
  const gap = (chartWidth - barWidth * data.length) / (data.length - 1);

  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  const svgHeight = CHART_HEIGHT + VALUE_HEIGHT;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title || 'LAST 7 DAYS EARNINGS'}</Text>

      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={svgHeight}>
          {data.map((d, i) => {
            const barHeight = (d.amount / maxAmount) * CHART_HEIGHT * 0.85;
            const x = i * (barWidth + gap);
            const y = svgHeight - barHeight - VALUE_HEIGHT + VALUE_HEIGHT;

            return (
              <React.Fragment key={d.day}>
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize={10}
                  fontWeight="600"
                  fill="#64748B"
                  textAnchor="middle"
                >
                  ₹{d.amount}
                </SvgText>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={BAR_RADIUS}
                  ry={BAR_RADIUS}
                  fill={d.isToday ? '#0E6DFD' : '#C7D7FE'}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        <View style={[styles.labelsRow, { width: chartWidth }]}>
          {data.map((d, i) => (
            <Text
              key={d.day}
              style={[
                styles.dayLabel,
                { width: barWidth, marginRight: i < data.length - 1 ? gap : 0 },
                d.isToday && styles.dayLabelActive,
              ]}
            >
              {d.day}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
  },
  dayLabelActive: {
    color: '#0E6DFD',
    fontFamily: FONT_FAMILY.outfitBold,
  },
});

export default WeeklyBarChart;
