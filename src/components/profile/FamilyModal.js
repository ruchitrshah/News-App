import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActionSheetIOS,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { X, UserPlus } from '../AppIcons';
import { Colors, Space, Type, Radius } from '../../brand';

// ─── Desktop-only bottom drawer ───────────────────────────────────────────────
// Uses ReactDOM.createPortal → renders into document.body, so position:fixed
// is relative to the true viewport and overlays the navbar correctly.

function DesktopDrawer({ member, onClose, children }) {
  const [mounted, setMounted] = useState(false);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (member) {
      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setOpen(true))
      );
    } else {
      setOpen(false);
      const t = setTimeout(() => setMounted(false), 420);
      return () => clearTimeout(t);
    }
  }, [member]);

  if (!mounted || typeof document === 'undefined') return null;

  const drawerNode = (
    <>
      <style>{`
        .fdrawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0);
          transition: background 380ms cubic-bezier(0.32, 0.72, 0, 1);
        }
        .fdrawer-backdrop.open {
          background: rgba(0, 0, 0, 0.46);
        }

        .fdrawer-sheet {
          position: fixed;
          left: 50%;
          bottom: 0;
          z-index: 9999;
          width: 100%;
          max-width: 560px;
          max-height: 82vh;
          transform: translateX(-50%) translateY(110%);
          transition: transform 420ms cubic-bezier(0.32, 0.72, 0, 1);
          border-radius: 20px 20px 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          will-change: transform;
        }
        .fdrawer-sheet.open {
          transform: translateX(-50%) translateY(0%);
        }

        .fdrawer-scroll {
          overflow-y: auto;
          flex: 1;
          overscroll-behavior: contain;
        }
        .fdrawer-scroll::-webkit-scrollbar { display: none; }

        .fdrawer-handle-wrap {
          display: flex;
          justify-content: center;
          padding-top: 12px;
          padding-bottom: 4px;
          flex-shrink: 0;
        }
        .fdrawer-handle {
          width: 36px;
          height: 4px;
          border-radius: 9999px;
          opacity: 0.22;
        }
      `}</style>

      {/* Backdrop — clicks through to close */}
      <div
        className={`fdrawer-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fdrawer-sheet${open ? ' open' : ''}`}
        style={{ backgroundColor: Colors.surface?.page || '#fff' }}
      >
        <div className="fdrawer-handle-wrap">
          <div
            className="fdrawer-handle"
            style={{ backgroundColor: Colors.text?.primary || '#000' }}
          />
        </div>
        <div className="fdrawer-scroll">
          {children}
        </div>
      </div>
    </>
  );

  // ✅ Portal to document.body — escapes all RN view containers
  return ReactDOM.createPortal(drawerNode, document.body);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FamilyModal({ member, onClose, onCopied }) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width > 1024;

  const handlePhoneAction = useCallback(
    async (number, name) => {
      if (!number || String(number).trim().length < 5) return;
      const phone = String(number).trim();

      const copy = async () => {
        await Clipboard.setStringAsync(phone);
        onCopied?.();
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', `Call ${phone}`, 'Send Message', 'Copy Number'],
            cancelButtonIndex: 0,
          },
          async (idx) => {
            if (idx === 1) Linking.openURL(`tel:${phone}`);
            if (idx === 2) Linking.openURL(`sms:${phone}`);
            if (idx === 3) await copy();
          }
        );
      } else if (Platform.OS === 'web') {
        await copy();
      } else {
        Alert.alert(name || 'Contact', phone, [
          { text: 'Call',   onPress: () => Linking.openURL(`tel:${phone}`) },
          { text: 'Copy',   onPress: copy },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [onCopied]
  );

  const detailsList = [
    { label: 'Full Name',  value: member?.name       || 'Not Provided'  },
    member?.subRelation
      ? { label: 'Relation Type',  value: member.subRelation } : null,
    { label: 'Occupation', value: member?.occupation || 'Not specified' },
    member?.maritalStatus
      ? { label: 'Marital Status', value: member.maritalStatus } : null,
    member?.status
      ? { label: 'Status',         value: member.status } : null,
  ].filter(Boolean);

  const renderContent = () => (
    <>
      <View style={styles.modalHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {member?.relation || 'Detail'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color={Colors.text?.onLight || '#000'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        {detailsList.map((item, index) => (
          <View key={`detail-${index}`}>
            <View style={styles.modalDetailRow}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
            {index < detailsList.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        {member?.phone ? (
          <TouchableOpacity
            style={styles.phoneActionCard}
            onPress={() => handlePhoneAction(member.phone, member.name)}
            activeOpacity={0.8}
          >
            <View style={styles.phoneInfo}>
              <Text style={styles.phoneValue}>{member.phone}</Text>
              <Text style={styles.note}>
                {isDesktopWeb ? 'Tap to copy number' : 'Tap to call, message, or copy'}
              </Text>
            </View>
            <View>
              <UserPlus size={20} color={Colors.brand?.primary} />
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: Space[40] }} />
      </ScrollView>
    </>
  );

  // ── DESKTOP WEB: portal-based full-viewport drawer ────────────────────
  if (isDesktopWeb) {
    return (
      <DesktopDrawer member={member} onClose={onClose}>
        {renderContent()}
      </DesktopDrawer>
    );
  }

  // ── MOBILE WEB + NATIVE: standard sheet modal ─────────────────────────
  if (!member) return null;

  return (
    <Modal
      visible={!!member}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={styles.modalRoot} edges={['bottom']}>
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.surface?.page,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[8],
  },
  titleContainer: {
    flex: 1,
    marginRight: Space[40],
  },
  modalTitle: { ...Type.modalTitle },
  closeButton: { padding: Space[4] },
  modalContent: { paddingHorizontal: Space[24] },
  modalDetailRow: { paddingVertical: Space[20] },
  divider: {
    height: 1,
    backgroundColor: Colors.surface?.soft,
  },
  label: {
    ...Type.formLabel,
    marginBottom: Space[8],
    color: Colors.text?.tertiary,
  },
  value: {
    ...Type.primaryValue,
    textTransform: 'none',
  },
  phoneActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface?.subtle,
    padding: Space[20],
    borderRadius: Radius[18],
    marginTop: Space[20],
    borderWidth: 1,
    borderColor: Colors.border?.subtle,
  },
  phoneInfo: { flex: 1 },
  phoneValue: {
    ...Type.primaryValue,
    color: Colors.brand?.primary,
  },
  note: {
    ...Type.hint,
    marginTop: Space[4],
    color: Colors.text?.tertiary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Space[12],
  },
});