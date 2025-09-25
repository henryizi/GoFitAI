import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  glass: 'rgba(255, 255, 255, 0.10)',
  glassStrong: 'rgba(255, 255, 255, 0.15)',
  white: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  border: 'rgba(255,255,255,0.15)'
};

export type TodayCardProps = {
  weightToday?: number;
  streakDays: number;
  onLogProgress: () => void;
};

export default function TodayCard({ weightToday, streakDays, onLogProgress }: TodayCardProps) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.glassStrong, colors.glass]} style={styles.gradient}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Icon name="calendar-today" size={18} color={colors.white} />
            </View>
            <Text style={styles.title}>TODAY</Text>
          </View>
          <View style={styles.badge}>
            <Icon name="fire" size={14} color={colors.white} />
            <Text style={styles.badgeText}>{streakDays}d Streak</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WEIGHT</Text>
            <View style={styles.statValueRow}>
              <Icon name="scale-bathroom" size={18} color={colors.primary} />
              <Text style={styles.statValue}>{typeof weightToday === 'number' ? weightToday.toFixed(1) : '--'}</Text>
              <Text style={styles.statUnit}>kg</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={onLogProgress} activeOpacity={0.85} style={styles.action}> 
            <LinearGradient 
              colors={['#FF6B35', '#F7931E', '#FF8C42']} 
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Shine overlay */}
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.3)',
                  'rgba(255,255,255,0.1)',
                  'transparent'
                ]}
                style={styles.actionShine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              
              {/* Content */}
              <View style={styles.actionContent}>
                <View style={styles.actionIconContainer}>
                  <Icon name="chart-line" size={18} color={colors.white} />
                </View>
                <Text style={styles.actionText}>Log Progress</Text>
                <Icon name="arrow-right" size={16} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  title: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,53,0.18)',
    borderColor: 'rgba(255,107,53,0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 8,
  },
  statUnit: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  action: {
    flex: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    position: 'relative',
  },
  actionShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
    zIndex: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    zIndex: 2,
  },
  actionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
}); 