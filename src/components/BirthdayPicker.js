import React, { useState, useMemo } from 'react';
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

// Constants for date selection
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

export default function BirthdayPicker({ 
  date, // Expected as ISO string YYYY-MM-DD or Date object
  onDateChange, 
  disabled = false,
  label = "Birthday",
  required = false 
}) {
  const initialDate = date ? new Date(date) : new Date(CURRENT_YEAR - 25, 0, 1);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDay, setTempDay] = useState(initialDate.getDate());
  const [tempMonth, setTempMonth] = useState(initialDate.getMonth());
  const [tempYear, setTempYear] = useState(initialDate.getFullYear());

  // Logic to determine days in month
  const daysInMonth = useMemo(() => {
    return new Date(tempYear, tempMonth + 1, 0).getDate();
  }, [tempMonth, tempYear]);

  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    // Ensure day is valid if month was changed (e.g., from 31 to 30)
    const validDay = Math.min(tempDay, daysInMonth);
    
    // Format month and day to ensure two digits (e.g., '02' instead of '2')
    const formattedMonth = String(tempMonth + 1).padStart(2, '0');
    const formattedDay = String(validDay).padStart(2, '0');
    
    // Construct the ISO string directly to avoid timezone offset shifts
    const isoString = `${tempYear}-${formattedMonth}-${formattedDay}`;
    
    onDateChange(isoString);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempDay(initialDate.getDate());
    setTempMonth(initialDate.getMonth());
    setTempYear(initialDate.getFullYear());
    setModalVisible(false);
  };

  const displayValue = date 
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
    : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label.toUpperCase()}
        {!!required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          disabled && styles.selectorTextDisabled,
          !displayValue && styles.selectorPlaceholder
        ]}>
          {displayValue || 'Select birthday...'}
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
              <Text style={styles.modalTitleText}>Select Birthday</Text>
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
            {/* Day Picker */}
            <View style={[styles.pickerColumn, { flex: 0.6 }]}>
              <Text style={styles.pickerLabel}>Day</Text>
              <Picker
                selectedValue={tempDay}
                onValueChange={setTempDay}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {DAYS.map(d => (
                  <Picker.Item key={d} label={`${d}`} value={d} color={Colors.text.onLight} />
                ))}
              </Picker>
            </View>

            {/* Month Picker */}
            <View style={[styles.pickerColumn, { flex: 1.2 }]}>
              <Text style={styles.pickerLabel}>Month</Text>
              <Picker
                selectedValue={tempMonth}
                onValueChange={setTempMonth}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {MONTHS.map((m, index) => (
                  <Picker.Item key={m} label={m} value={index} color={Colors.text.onLight} />
                ))}
              </Picker>
            </View>

            {/* Year Picker */}
            <View style={[styles.pickerColumn, { flex: 0.8 }]}>
              <Text style={styles.pickerLabel}>Year</Text>
              <Picker
                selectedValue={tempYear}
                onValueChange={setTempYear}
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
              title="Confirm Birthday"
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
  selectorDisabled: { backgroundColor: Colors.surface.soft, borderColor: Colors.border.subtle },
  selectorText: { ...Type.primaryValue, fontSize: 16, color: Colors.text.onLight, flex: 1 },
  selectorTextDisabled: { color: Colors.text.disabled },
  selectorPlaceholder: { color: Colors.text.disabled },
  
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

  pickersContainer: { 
    flexDirection: 'row', 
    paddingVertical: Space[24],
    paddingHorizontal: Space[16],
    flex: 1,
    alignItems: 'center'
  },
  pickerColumn: { alignItems: 'center' },
  pickerLabel: { ...Type.label, color: Colors.text.tertiary, marginBottom: Space[8] },
  picker: { width: '100%', height: 215 },
  pickerItem: { ...Type.primaryValue, fontSize: 18, height: 215 }, // Slightly smaller font for 3 columns
  
  footer: { 
    paddingHorizontal: Space[24], 
    paddingBottom: Platform.OS === 'ios' ? Space[20] : Space[30],
    marginTop: 'auto' 
  },
});