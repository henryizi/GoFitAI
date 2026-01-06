import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../../styles/colors';

const { width: screenWidth } = Dimensions.get('window');
const CHART_SIZE = screenWidth - 80;
const CENTER_X = CHART_SIZE / 2;
const CENTER_Y = CHART_SIZE / 2;
const RADIUS = CHART_SIZE / 2 - 50; // Reduced radius to make room for labels
const MAX_VALUE = 10;
const LABEL_DISTANCE = RADIUS + 30; // Increased distance for labels

interface MuscleGroupData {
  chest: number;
  back: number;
  legs: number;
  shoulders: number;
  arms: number;
  core: number;
}

interface Props {
  data: MuscleGroupData;
}

const MuscleGroupRadarChart: React.FC<Props> = ({ data }) => {
  const muscleGroups = [
    { key: 'chest', label: 'Chest', angle: -90 },
    { key: 'back', label: 'Back', angle: -30 },
    { key: 'legs', label: 'Legs', angle: 30 },
    { key: 'shoulders', label: 'Shoulders', angle: 90 },
    { key: 'arms', label: 'Arms', angle: 150 },
    { key: 'core', label: 'Core', angle: -150 },
  ];

  // Convert angles to radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Get point coordinates for a given angle and value
  const getPoint = (angle: number, value: number) => {
    const normalizedValue = Math.min(value, MAX_VALUE) / MAX_VALUE;
    const distance = RADIUS * normalizedValue;
    const rad = toRadians(angle);
    return {
      x: CENTER_X + distance * Math.cos(rad),
      y: CENTER_Y + distance * Math.sin(rad),
    };
  };

  // Generate grid circles (0, 2, 4, 6, 8, 10)
  const gridLevels = [0, 2, 4, 6, 8, 10];
  
  // Generate polygon points
  const polygonPoints = muscleGroups
    .map((mg) => {
      const value = data[mg.key as keyof MuscleGroupData] || 0;
      const point = getPoint(mg.angle, value);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  // Generate axis lines
  const axisLines = muscleGroups.map((mg) => {
    const endPoint = getPoint(mg.angle, MAX_VALUE);
    return { start: { x: CENTER_X, y: CENTER_Y }, end: endPoint, label: mg.label, angle: mg.angle };
  });

  return (
    <View style={styles.container}>
      <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`-20 -20 ${CHART_SIZE + 40} ${CHART_SIZE + 40}`}>
        {/* Grid circles */}
        {gridLevels.map((level, index) => {
          const radius = (RADIUS * level) / MAX_VALUE;
          return (
            <Circle
              key={level}
              cx={CENTER_X}
              cy={CENTER_Y}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Grid labels (0, 2, 4, 6, 8, 10) */}
        {gridLevels.map((level) => {
          if (level === 0) return null;
          const labelRadius = (RADIUS * level) / MAX_VALUE;
          const labelX = CENTER_X + labelRadius * Math.cos(toRadians(-90));
          const labelY = CENTER_Y + labelRadius * Math.sin(toRadians(-90)) - 8;
          return (
            <SvgText
              key={`label-${level}`}
              x={labelX}
              y={labelY}
              fontSize="10"
              fill="rgba(255,255,255,0.5)"
              textAnchor="middle"
              fontWeight="600"
            >
              {level}
            </SvgText>
          );
        })}

        {/* Axis lines */}
        {axisLines.map((axis, index) => (
          <Line
            key={index}
            x1={axis.start.x}
            y1={axis.start.y}
            x2={axis.end.x}
            y2={axis.end.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(46,213,115,0.3)"
          stroke="#2ED573"
          strokeWidth="2"
        />

        {/* Data points */}
        {muscleGroups.map((mg, index) => {
          const value = data[mg.key as keyof MuscleGroupData] || 0;
          const point = getPoint(mg.angle, value);
          return (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#2ED573"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Axis labels */}
        {axisLines.map((axis, index) => {
          const value = data[muscleGroups[index].key as keyof MuscleGroupData] || 0;
          
          // Adjust label position based on angle to prevent overlap
          let labelX = CENTER_X + LABEL_DISTANCE * Math.cos(toRadians(axis.angle));
          let labelY = CENTER_Y + LABEL_DISTANCE * Math.sin(toRadians(axis.angle));
          
          // Special handling for top label (Chest at -90 degrees) to move it further up
          if (axis.angle === -90) {
            labelY = CENTER_Y + LABEL_DISTANCE * Math.sin(toRadians(axis.angle)) - 5;
          }
          
          return (
            <G key={`label-${index}`}>
              <SvgText
                x={labelX}
                y={labelY}
                fontSize="11"
                fill={colors.white}
                textAnchor="middle"
                fontWeight="700"
              >
                {axis.label}
              </SvgText>
              <SvgText
                x={labelX}
                y={labelY + 14}
                fontSize="10"
                fill="#2ED573"
                textAnchor="middle"
                fontWeight="600"
              >
                {value.toFixed(1)}/10
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
});

export default MuscleGroupRadarChart;







