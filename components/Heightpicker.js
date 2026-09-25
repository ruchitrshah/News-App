import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal as RNModal, // ✅ This must be explicitly aliased here
  TouchableOpacity, 
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { X } from './AppIcons';
import { Colors, Space, Type, Radius } from '../brand';
import Button from './Button';

const FEET_OPTIONS = Array.from({ length: 4 }, (_, i) => i + 4); 
const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i);  

export default function HeightPicker({ 
  feet, 
  inches, 
  onHeightChange, 
  disabled = false,
  label = "Height",
  required = false 
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempFeet, setTempFeet] = useState(feet || 5);
  const [tempInches, setTempInches] = useState(inches || 0);

  const handleConfirm = () => {
    onHeightChange(tempFeet, tempInches);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempFeet(feet || 5);
    setTempInches(inches || 0);
    setModalVisible(false);
  };

  const displayValue = feet && inches !== undefined ? `${feet}' ${inches}"` : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label.toUpperCase()}
        {!!required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          disabled && styles.selectorTextDisabled,
          !displayValue && styles.selectorPlaceholder
        ]}>
          {displayValue || 'Select height...'}
        </Text>
      </TouchableOpacity>

      <RNModal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet" 
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalRoot} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitleText}>Select Height</Text>
            </View>

            <TouchableOpacity 
              onPress={handleCancel} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={28} color={Colors.text.onLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickersContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Feet</Text>
              <Picker
                selectedValue={tempFeet}
                onValueChange={setTempFeet}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {FEET_OPTIONS.map(f => (
                  <Picker.Item key={f} label={`${f}`} value={f} color={Colors.text.onLight} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Inches</Text>
              <Picker
                selectedValue={tempInches}
                onValueChange={setTempInches}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {INCHES_OPTIONS.map(i => (
                  <Picker.Item key={i} label={`${i}`} value={i} color={Colors.text.onLight} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Confirm Height"
              onPress={handleConfirm}
            />
          </View>
        </SafeAreaView>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Space[16],
    marginBottom: Space[16],
    width: '100%',
  },
  label: { ...Type.formLabel, marginBottom: Space[8] },
  required: { color: Colors.status.danger },
  selector: {
    height: Space[56],
    borderWidth: 1,
    borderRadius: Radius[12], 
    paddingHorizontal: Space[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface.page,
    borderColor: Colors.border.subtle,
  },
  selectorDisabled: { backgroundColor: Colors.surface.soft, borderColor: Colors.border.subtle },
  selectorText: { ...Type.primaryValue, fontSize: 16, color: Colors.text.onLight, flex: 1 },
  selectorTextDisabled: { color: Colors.text.disabled },
  selectorPlaceholder: { color: Colors.text.disabled },
  
  modalRoot: { 
    flex: 1, 
    backgroundColor: Colors.surface.page 
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[16],
    width: '100%',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: Space[40], 
  },
  modalTitleText: { 
    ...Type.modalTitle, 
    color: Colors.text.primary 
  },
  closeButton: {
    padding: Space[4],
    top: Space[32],
    right: Space[20],
    position: 'absolute',
  },

  pickersContainer: { 
    flexDirection: 'row', 
    paddingVertical: Space[24],
    paddingHorizontal: Space[16],
    flex: 1,
    alignItems: 'center'
  },
  pickerColumn: { flex: 1, alignItems: 'center' },
  pickerLabel: { ...Type.label, color: Colors.text.tertiary, marginBottom: Space[8] },
  picker: { width: '100%', height: 215 },
  pickerItem: { ...Type.primaryValue, fontSize: 22, height: 215 },
  
  footer: { 
    paddingHorizontal: Space[24], 
    paddingBottom: Platform.OS === 'ios' ? Space[20] : Space[30],
    marginTop: 'auto' 
  },
});