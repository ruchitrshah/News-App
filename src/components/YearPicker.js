import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal as RNModal, 
  TouchableOpacity, 
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { X } from './AppIcons';
import { Colors, Space, Type, Radius } from '../brand';
import Button from './Button';

const CURRENT_YEAR = new Date().getFullYear();
// Generates years from 1970 to 10 years in the future
const YEARS = Array.from({ length: (CURRENT_YEAR + 11) - 1970 }, (_, i) => CURRENT_YEAR + 10 - i);

export default function YearPicker({ 
  year, 
  onYearChange, 
  disabled = false,
  label = "Graduation Year",
  required = false,
  error = ''
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempYear, setTempYear] = useState(year ? parseInt(year, 10) : CURRENT_YEAR);

  const handleConfirm = () => {
    onYearChange(String(tempYear));
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempYear(year ? parseInt(year, 10) : CURRENT_YEAR);
    setModalVisible(false);
  };

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
          !!error && styles.selectorError
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          disabled && styles.selectorTextDisabled,
          !year && styles.selectorPlaceholder
        ]}>
          {year || 'Select year...'}
        </Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <RNModal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet" 
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalRoot} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitleText}>Select Year</Text>
            </View>

            <TouchableOpacity 
              onPress={handleCancel} 
              style={styles.closeButton}
            
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={28} color={Colors.text.onLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickersContainer}>
            <View style={styles.pickerColumn}>
              <Picker
                selectedValue={tempYear}
                onValueChange={(val) => setTempYear(val)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {YEARS.map(y => (
                  <Picker.Item key={y} label={`${y}`} value={y} color={Colors.text.onLight} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Confirm Year"
              onPress={handleConfirm}
            />
          </View>
        </SafeAreaView>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Space[16], marginBottom: Space[16], width: '100%' },
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
  selectorError: { borderColor: Colors.status.danger },
  selectorDisabled: { backgroundColor: Colors.surface.soft, borderColor: Colors.border.subtle },
  selectorText: { ...Type.primaryValue, fontSize: 16, color: Colors.text.onLight, flex: 1 },
  selectorTextDisabled: { color: Colors.text.disabled },
  selectorPlaceholder: { color: Colors.text.disabled },
  errorText: { ...Type.hint, color: Colors.status.danger, marginTop: Space[8] },
  
  modalRoot: { flex: 1, backgroundColor: Colors.surface.page },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[16],
    width: '100%',
  },
  modalTitleContainer: { flex: 1, marginRight: Space[40] },
  modalTitleText: { ...Type.modalTitle, color: Colors.text.primary },
  closeButton: { padding: Space[4], top: Space[32], right: Space[20], position: 'absolute' },
  pickersContainer: { flex: 1, paddingHorizontal: Space[16], justifyContent: 'center' },
  pickerColumn: { width: '100%' },
  picker: { width: '100%', height: 215 },
  pickerItem: { ...Type.primaryValue, fontSize: 22, height: 215 },
  footer: { 
    paddingHorizontal: Space[24], 
    paddingBottom: Platform.OS === 'ios' ? Space[20] : Space[30],
    marginTop: 'auto' 
  },
});