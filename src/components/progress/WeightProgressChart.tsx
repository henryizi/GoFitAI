import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Line as SvgLine, Text as SvgText, Circle as SvgCircle } from 'react-native-svg';
import { colors as themeColors } from '../../styles/colors';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Responsive chart dimensions
const getChartDimensions = (customWidth?: number) => {
  const isSmallScreen = screenWidth < 375;
  const isLargeScreen = screenWidth > 414;
  const width = customWidth || (screenWidth - 48);

  return {
    width: width,
    height: isSmallScreen ? 200 : isLargeScreen ? 280 : 240,
    containerMinHeight: isSmallScreen ? 280 : isLargeScreen ? 360 : 320,
  };
};

// Use app theme colors (dark background + orange brand)
const colors = {
  ...themeColors,
  chartLine: themeColors.lightGray,
  chartDot: themeColors.primary,
  chartDotSelected: themeColors.primary,
  white: '#FFFFFF',
};

type DailyMetric = {
  metric_date: string;
  weight_kg: number | null;
};

type Props = {
  data: DailyMetric[];
  showAllValueLabels?: boolean;
  chartWidth?: number;
  showHeaderAndStats?: boolean; // New prop to control header/stats display
  chartOnly?: boolean; // New prop for chart-only mode
};

const WeightProgressChart = React.memo(({ data, showAllValueLabels = true, chartWidth, showHeaderAndStats = true, chartOnly = false }: Props) => {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    value: number;
    date: string;
    index: number;
  } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Process and sort data properly
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter out entries with no weight data and sort by date
    const validEntries = data
      .filter(entry => entry.weight_kg !== null && entry.weight_kg > 0)
      .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());
    
    return validEntries;
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (processedData.length === 0) {
      return {
        avgWeight: 0,
        minWeight: 0,
        maxWeight: 0,
        weightChange: 0,
        weightChangePercent: 0,
        totalDays: 0,
        firstWeight: 0,
        lastWeight: 0,
      };
    }

    const weights = processedData.map(d => d.weight_kg!);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const weightChange = lastWeight - firstWeight;
    const weightChangePercent = firstWeight > 0 ? ((weightChange / firstWeight) * 100) : 0;
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    return {
      avgWeight,
      minWeight,
      maxWeight,
      weightChange,
      weightChangePercent,
      totalDays: processedData.length,
      firstWeight,
      lastWeight,
    };
  }, [processedData]);

  // Get chart dimensions
  const chartDimensions = useMemo(() => getChartDimensions(chartWidth), [chartWidth]);

  // Format chart data
  const chartData = useMemo(() => {
    if (processedData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    // Create labels that show all dates consistently
    const labels = processedData.map((entry, index) => {
      const date = new Date(entry.metric_date);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${mm}.${dd}`;
    });

    // Real data dataset
    const baseData = processedData.map(d => d.weight_kg!);

    return {
      labels: labels,
      datasets: [
        {
          data: baseData,
          color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
          strokeWidth: 2.5,
        },
      ],
    };
  }, [processedData]);

  // Chart configuration matching the reference
  const chartConfig = useMemo(() => {
    return {
      backgroundGradientFrom: 'transparent',
      backgroundGradientFromOpacity: 0,
      backgroundGradientTo: 'transparent',
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
      strokeWidth: 2.5,
      barPercentage: 0.5,
      useShadowColorFromDataset: true,
      fillShadowGradient: colors.primary,
      fillShadowGradientFrom: colors.primary,
      fillShadowGradientTo: colors.primary,
      fillShadowGradientOpacity: 0.16,
      labelColor: (opacity = 1) => themeColors.textSecondary,
      decimalPlaces: 1,
      propsForDots: {
        r: '3',
        strokeWidth: '2',
        fill: colors.primary,
        stroke: colors.white,
      },
      propsForBackgroundLines: {
        strokeDasharray: '0',
        stroke: colors.chartLine,
        strokeWidth: 1,
      },
      propsForLabels: {
        fontFamily: 'System',
        fontSize: 11,
        fontWeight: '600',
        color: themeColors.textSecondary,
      },
      propsForVerticalLabels: {
        fontFamily: 'System',
        fontSize: 13,
        fontWeight: '700',
        color: themeColors.textSecondary,
      },
    };
  }, [stats]);

  if (processedData.length < 2) {
    return (
      <Animated.View style={[
        styles.noDataContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        <LinearGradient
          colors={[
            'rgba(255,107,53,0.1)',
            'rgba(255,107,53,0.05)',
            'rgba(255,255,255,0.03)'
          ]}
          style={styles.noDataGradient}
        >
          <View style={styles.noDataIconContainer}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.noDataIconGradient}
            >
              <Icon name="chart-line-variant" size={32} color={colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.noDataTitle}>No Progress Data</Text>
          <Text style={styles.noDataText}>
            Log your weight for at least two days to see your progress trend.
          </Text>
          <View style={styles.noDataProgress}>
            <View style={styles.noDataProgressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={[styles.noDataProgressFill, { width: `${Math.min(50, processedData.length * 25)}%` }]}
              />
            </View>
            <Text style={styles.noDataProgressText}>
              {processedData.length} of 2 entries needed
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // If chartOnly mode, return only the chart container
  if (chartOnly) {
    return (
      <View style={styles.chartContainer}>
        {processedData.length > 7 && (
          <View style={styles.scrollIndicator}>
            <Icon name="gesture-swipe-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.scrollIndicatorText}>Swipe to see more data</Text>
          </View>
        )}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={Math.max(chartDimensions.width, processedData.length * 60)}
              height={240}
              chartConfig={chartConfig}
              style={styles.chart}
              withDots={true}
              withShadow={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              withInnerLines={false}
              withHorizontalLabels={true}
              yAxisSuffix=""
              fromZero={false}
              yLabelsOffset={-8}
              xLabelsOffset={-5}
              yAxisInterval={1}
              segments={4}
              bezier
              decorator={(props: any) => {
                const { width, x, y } = props || {};
                const avg = stats.avgWeight || 0;
                const yPos = y ? y(avg) : 0;

                const values: number[] = (chartData?.datasets?.[0]?.data as number[]) || [];
                const totalPoints = values.length;

                const avgLine = (
                  <SvgLine
                    key="avg-line"
                    x1={0}
                    y1={yPos}
                    x2={width}
                    y2={yPos}
                    stroke={colors.chartLine}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );

                // Show all value labels for better visibility
                const labels = values.map((v, i) => {
                  if (!x || !y) return null;

                  const cx = x(i);
                  const cy = y(v) - 14;
                  return (
                    <SvgText
                      key={`val-${i}`}
                      x={cx}
                      y={cy}
                      fontSize={9}
                      fontWeight="700"
                      fill={themeColors.text}
                      textAnchor="middle"
                    >
                      {v.toFixed(1)}
                    </SvgText>
                  );
                });

                const dots = values.map((v, i) => {
                  if (!x || !y) return null;
                  const cx = x(i);
                  const cy = y(v);
                  return (
                    <SvgCircle
                      key={`dot-${i}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={colors.primary}
                      stroke={colors.white}
                      strokeWidth={2}
                    />
                  );
                });

                return [avgLine, ...dots, ...labels];
              }}
              formatYLabel={(val) => {
                const num = Number(val);
                if (Number.isNaN(num)) return '';
                return num.toFixed(1);
              }}
            />
          </View>
        </ScrollView>
        {/* Left edge mask to clip bezier/gradient bleed */}
        <View pointerEvents="none" style={styles.edgeMaskLeft} />
      </View>
    );
  }

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      {/* Enhanced chart header with statistics - conditionally rendered */}
      {showHeaderAndStats && (
        <>
          <View style={styles.chartHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.chartTitleContainer}>
                <Icon name="chart-line" size={18} color={colors.primary} />
                <Text style={styles.chartTitle}>Weight Trend</Text>
              </View>
              <Text style={styles.chartSubtitle}>
                {stats.totalDays} days tracked • Avg: {stats.avgWeight.toFixed(1)}kg
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.weightChangeContainer}>
                <Icon
                  name={stats.weightChange >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={stats.weightChange >= 0 ? colors.error : colors.success}
                />
                <Text style={[
                  styles.weightChangeText,
                  { color: stats.weightChange >= 0 ? colors.error : colors.success }
                ]}>
                  {Math.abs(stats.weightChange).toFixed(1)} kg
                </Text>
              </View>
              <Text style={styles.weightChangePercent}>
                {Math.abs(stats.weightChangePercent).toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Statistics row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.minWeight.toFixed(1)}</Text>
              <Text style={styles.statLabel}>MIN</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgWeight.toFixed(1)}</Text>
              <Text style={styles.statLabel}>AVG</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.maxWeight.toFixed(1)}</Text>
              <Text style={styles.statLabel}>MAX</Text>
            </View>
          </View>
        </>
      )}

      {/* Chart container */}
      <View style={styles.chartContainer}>
        {processedData.length > 7 && (
          <View style={styles.scrollIndicator}>
            <Icon name="gesture-swipe-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.scrollIndicatorText}>Swipe to see more data</Text>
          </View>
        )}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={Math.max(chartDimensions.width, processedData.length * 60)}
              height={240}
              chartConfig={chartConfig}
              style={styles.chart}
              withDots={true}
              withShadow={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              withInnerLines={false}
              withHorizontalLabels={true}
              yAxisSuffix=""
              fromZero={false}
              yLabelsOffset={-8}
              xLabelsOffset={-5}
              yAxisInterval={1}
              segments={4}
              bezier
              decorator={(props: any) => {
                const { width, x, y } = props || {};
                const avg = stats.avgWeight || 0;
                const yPos = y ? y(avg) : 0;

                const values: number[] = (chartData?.datasets?.[0]?.data as number[]) || [];
                const totalPoints = values.length;

                const avgLine = (
                  <SvgLine
                    key="avg-line"
                    x1={0}
                    y1={yPos}
                    x2={width}
                    y2={yPos}
                    stroke={colors.chartLine}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );

                // Show all value labels for better visibility
                const labels = values.map((v, i) => {
                  if (!x || !y) return null;

                  const cx = x(i);
                  const cy = y(v) - 14;
                  return (
                    <SvgText
                      key={`val-${i}`}
                      x={cx}
                      y={cy}
                      fontSize={9}
                      fontWeight="700"
                      fill={themeColors.text}
                      textAnchor="middle"
                    >
                      {v.toFixed(1)}
                    </SvgText>
                  );
                });

                const dots = values.map((v, i) => {
                  if (!x || !y) return null;
                  const cx = x(i);
                  const cy = y(v);
                  return (
                    <SvgCircle
                      key={`dot-${i}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={colors.primary}
                      stroke={colors.white}
                      strokeWidth={2}
                    />
                  );
                });

                return [avgLine, ...dots, ...labels];
              }}
              formatYLabel={(val) => {
                const num = Number(val);
                if (Number.isNaN(num)) return '';
                return num.toFixed(1);
              }}
              onDataPointClick={({ value, x, y, index }) => {
                if (tooltip?.visible && tooltip.x === x && tooltip.y === y) {
                  setTooltip(null);
                } else {
                  setTooltip({
                    x,
                    y,
                    visible: true,
                    value,
                    date: chartData.labels[index] || processedData[index]?.metric_date || '',
                    index,
                  });
                }
              }}
              renderDotContent={({ x, y, index }) => {
                const isSelected = tooltip?.visible && tooltip.x === x && tooltip.y === y;
                const totalPoints = processedData.length;
                const isFirst = index === 0;
                const isLast = index === totalPoints - 1;
                const value = processedData[index]?.weight_kg ?? 0;
                const dateRaw = processedData[index]?.metric_date;
                const dt = dateRaw ? new Date(dateRaw) : null;
                const mm = dt ? String(dt.getMonth() + 1).padStart(2, '0') : '';
                const dd = dt ? String(dt.getDate()).padStart(2, '0') : '';

                return (
                  <View key={`dot-${index}`}>
                    {/* Always show numeric value above each point for visibility */}
                    <Text
                      style={{
                        position: 'absolute',
                        top: Math.max(2, y - 18),
                        left: x - 16,
                        width: 32,
                        textAlign: 'center',
                        color: colors.white,
                        fontWeight: '700',
                        fontSize: 10,
                        textShadowColor: 'rgba(0,0,0,0.8)',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 2,
                      }}
                    >
                      {Number(value).toFixed(1)}
                    </Text>
                    {isSelected && (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: x,
                          height: 240,
                          borderLeftWidth: 1,
                          borderStyle: 'dashed',
                          borderColor: colors.chartLine,
                          opacity: 0.9,
                        }}
                      />
                    )}
                    {isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          top: Math.max(8, y - 46),
                          left: Math.max(8, x - 44),
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          backgroundColor: 'rgba(28, 28, 30, 0.98)',
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                          {`${mm}.${dd}`}  {value.toFixed(1)}kg
                        </Text>
                        <View
                          style={{
                            position: 'absolute',
                            bottom: -6,
                            left: 40,
                            width: 12,
                            height: 12,
                            backgroundColor: 'rgba(28, 28, 30, 0.98)',
                            transform: [{ rotate: '45deg' }],
                            borderBottomLeftRadius: 2,
                          }}
                        />
                      </View>
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        top: y - (isSelected ? 7 : 4),
                        left: x - (isSelected ? 7 : 4),
                        width: isSelected ? 14 : 8,
                        height: isSelected ? 14 : 8,
                        borderRadius: isSelected ? 7 : 4,
                        backgroundColor: isSelected ? '#FFFFFF' : colors.chartDot,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: isSelected ? colors.chartDot : 'transparent',
                      }}
                    />
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
        {/* Left edge mask to clip bezier/gradient bleed */}
        <View pointerEvents="none" style={styles.edgeMaskLeft} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  weightChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  weightChangeText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },
  weightChangePercent: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chartContainer: {
    position: 'relative',
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 320,
    paddingVertical: 20,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 20,
    paddingLeft: 45,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    width: '100%',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingLeft: 20,
    minWidth: '100%',
  },
  edgeMaskLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 12,
    backgroundColor: colors.surface,
  },
  noDataContainer: {
    height: 280,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noDataGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noDataIconContainer: {
    marginBottom: 20,
  },
  noDataIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  noDataText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 24,
  },
  noDataProgress: {
    width: '100%',
    alignItems: 'center',
  },
  noDataProgressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  noDataProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  noDataProgressText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  chartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  dotMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCenter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.chartDot,
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedDotMarker: {
    backgroundColor: 'rgba(255, 107, 53, 0.4)',
    width: 28,
    height: 28,
    borderRadius: 14,
    top: -14,
    left: -14,
  },
  selectedDotCenter: {
    backgroundColor: colors.white,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.chartDot,
    shadowColor: colors.primary,
    shadowRadius: 8,
    shadowOpacity: 0.6,
    elevation: 6,
  },
  dotPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    top: -20,
    left: -20,
    zIndex: -1,
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 20,
    width: 140,
    alignItems: 'center',
  },
  tooltip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  tooltipValue: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
  },
  tooltipDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tooltipPillContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
  },
  tooltipPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#EEF4FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  tooltipPillText: {
    color: '#334155',
    fontWeight: '700',
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  scrollIndicatorText: {
    marginLeft: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default WeightProgressChart; 