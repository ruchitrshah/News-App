import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from './AppIcons';
import { Colors, Space, Radius, Type, FontFamilies, FontSizes, LineHeights } from '../brand';

export default function Stepper({ currentStep, totalSteps = 7 }) { // Defaulted to 7 per your previous onboarding flow
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <View 
              key={index} 
              style={[
                styles.stepWrapper, 
                !isLast && { flex: 1 } // ✅ Fill width for all segments except the last circle
              ]}
            >
              {/* Step Circle */}
              <View style={[
                styles.step, 
                isCompleted && styles.completedStep, 
                isCurrent && styles.currentStep
              ]}>
                {isCompleted ? (
                  <Check size={18} color="#fff" strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepText, isCurrent && styles.activeStepText]}>
                    {stepNumber}
                  </Text>
                )}
              </View>

              {/* Connector Line */}
              {!isLast && (
                <View style={[
                  styles.connector, 
                  isCompleted && styles.completedConnector
                ]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Space[24],
    paddingHorizontal: Space[24],
    backgroundColor: Colors.surface.page,
    width: '100%', // ✅ Ensure container takes full width
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // ✅ Ensure inner row takes full width
  },
  stepWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },

  step: {
    width: 32, // Slightly smaller for 7 steps to avoid crowding
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface.soft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.subtle,
    zIndex: 2, // Keeps circle above connectors
  },
  completedStep: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  currentStep: {
    backgroundColor: Colors.surface.page,
    borderColor: Colors.brand.primary,
  },

  stepText: {
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[13],
    color: Colors.text.tertiary,
  },
  activeStepText: { 
    color: Colors.brand.primary 
  },

  connector: {
    flex: 1, // ✅ Grow to fill space between steps
    height: 2,
    backgroundColor: Colors.border.subtle,
    marginHorizontal: 2, // Tiny gap to keep it clean
  },
  completedConnector: { 
    backgroundColor: Colors.brand.primary 
  },
});