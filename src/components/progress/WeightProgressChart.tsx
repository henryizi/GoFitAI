import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const screenWidth = Dimensions.get('window').width;

// Enhanced color scheme matching the app design
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  surface: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  background: 'transparent',
  white: '#FFFFFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  chartLine: '#FF6B35',
  chartDot: '#FF6B35',
  chartDotSelected: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassStrong: 'rgba(255, 255, 255, 0.15)',
};

type DailyMetric = {
  metric_date: string;
  weight_kg: number | null;
};

type Props = {
  data: DailyMetric[];
};

const WeightProgressChart = ({ data }: Props) => {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    value: number;
    date: string;
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

  // Format chart data
  const chartData = useMemo(() => {
    if (processedData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    // Create smart labels - show fewer labels for better readability
    const labels = processedData.map((entry, index) => {
      const date = new Date(entry.metric_date);
      const isFirst = index === 0;
      const isLast = index === processedData.length - 1;
      const isMiddle = index === Math.floor(processedData.length / 2);
      
      // Show label for first, middle, and last points, or every 3rd point if many data points
      if (isFirst || isLast || isMiddle || processedData.length <= 5 || index % 3 === 0) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return '';
    });

    return {
      labels,
      datasets: [
        {
          data: processedData.map(d => d.weight_kg!),
          color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [processedData]);

  // Enhanced chart configuration
  const chartConfig = useMemo(() => {
    const weightRange = stats.maxWeight - stats.minWeight;
    const padding = weightRange * 0.1; // 10% padding
    
    return {
      backgroundGradientFrom: 'transparent',
      backgroundGradientFromOpacity: 0,
      backgroundGradientTo: 'transparent',
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
      strokeWidth: 3,
      barPercentage: 0.5,
      useShadowColorFromDataset: false,
      decimalPlaces: 1,
      propsForDots: {
        r: '6',
        strokeWidth: '3',
        stroke: colors.chartDot,
        fill: colors.white,
      },
      propsForBackgroundLines: {
        strokeDasharray: '4',
        stroke: 'rgba(255,255,255,0.12)',
        strokeWidth: 1,
      },
      propsForLabels: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
      },
      propsForVerticalLabels: {
        fontFamily: 'System',
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
      },
      // Dynamic Y-axis scaling
      yAxisMin: Math.max(0, stats.minWeight - padding),
      yAxisMax: stats.maxWeight + padding,
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

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      {/* Enhanced chart header with statistics */}
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

      {/* Enhanced chart container */}
      <View style={styles.chartContainer}>
        {/* Multi-layer background gradients */}
        <LinearGradient
          colors={[
            'rgba(28, 28, 30, 0.98)', 
            'rgba(28, 28, 30, 0.9)', 
            'rgba(28, 28, 30, 0.6)'
          ]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.12)',
            'rgba(255, 107, 53, 0.06)',
            'rgba(255, 107, 53, 0.02)'
          ]}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
        />
        
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={screenWidth - 120}
            height={160}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={false}
            yAxisSuffix=" kg"
            fromZero={false}
            yLabelsOffset={-8}
            xLabelsOffset={-5}
            yAxisInterval={1}
            segments={4}
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
                });
              }
            }}
            decorator={() => {
              return (
                <View style={styles.chartOverlay}>
                  <LinearGradient
                    colors={[
                      'rgba(255, 107, 53, 0.2)', 
                      'rgba(255, 107, 53, 0.08)', 
                      'rgba(255, 107, 53, 0)'
                    ]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              );
            }}
            renderDotContent={({x, y, index}) => {
              const isSelected = tooltip?.visible && tooltip.x === x && tooltip.y === y;
              return (
                <View
                  key={index}
                  style={[
                    styles.dotMarker,
                    { top: y - 10, left: x - 10 },
                    isSelected && styles.selectedDotMarker,
                  ]}
                >
                  <View style={[styles.dotCenter, isSelected && styles.selectedDotCenter]} />
                  {isSelected && <View style={styles.dotPulse} />}
                </View>
              );
            }}
          />
        </View>
        
        {/* Enhanced tooltip */}
        {tooltip?.visible && (
          <View style={[
            styles.tooltipContainer, 
            { 
              top: tooltip.y - 80, 
              left: tooltip.x > screenWidth / 2 ? tooltip.x - 110 : tooltip.x - 30 
            }
          ]}>
            <LinearGradient
              colors={[
                'rgba(28, 28, 30, 0.98)', 
                'rgba(28, 28, 30, 0.95)'
              ]}
              style={styles.tooltip}
            >
              <Text style={styles.tooltipValue}>{tooltip.value.toFixed(1)} kg</Text>
              <Text style={styles.tooltipDate}>
                {tooltip.date.includes('/') 
                  ? new Date(
                      new Date().getFullYear(), 
                      parseInt(tooltip.date.split('/')[0], 10) - 1, 
                      parseInt(tooltip.date.split('/')[1], 10)
                    ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              </Text>
              <View style={styles.tooltipArrow} />
            </LinearGradient>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

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
    color: colors.white,
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
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 280,
    paddingVertical: 20,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 16,
    paddingLeft: 35,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingLeft: 20,
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
});

export default WeightProgressChart; 