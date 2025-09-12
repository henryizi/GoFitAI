import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { colors } from '../../styles/colors';
import { Database } from '../../types/database';
import { getExerciseInfo } from '../../constants/exerciseNames';

export type Exercise = Database['public']['Tables']['exercises']['Row'];

interface Props {
  exercise: Exercise;
  onPress?: () => void;
}

export const ExerciseCard: React.FC<Props> = ({ exercise, onPress }) => {
  const exerciseInfo = getExerciseInfo(exercise.name);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card} mode="contained">
        <Card.Content>
          <View style={styles.content}>
            <View style={styles.details}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={styles.title}>
                  {exercise.name}
                </Text>
                <Chip style={styles.categoryChip}>
                  {exerciseInfo?.category || exercise.category}
                </Chip>
              </View>
              <View style={styles.badgesRow}>
                {exercise.muscle_groups.slice(0, 3).map((mg) => (
                  <Chip key={mg} style={styles.muscleChip} compact>
                    {mg}
                  </Chip>
                ))}
              </View>
              <Text variant="bodySmall" style={styles.difficulty}>
                Difficulty: {exerciseInfo?.difficulty || exercise.difficulty}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    backgroundColor: colors.card,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
    color: colors.text,
  },
  categoryChip: {
    backgroundColor: colors.accent,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  muscleChip: {
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: colors.primaryLight,
  },
  difficulty: {
    marginTop: 4,
    color: colors.textSecondary,
  },
}); 