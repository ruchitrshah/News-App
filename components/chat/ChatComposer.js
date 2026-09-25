import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Keyboard,
} from 'react-native';
import { ArrowUp } from 'lucide-react-native';

import { Colors, Space, Radius, Type, FontFamilies } from '../../brand';
import { useBottomInset } from '../../brand/responsive';

const MAX_LENGTH = 4000; // matches the messages_body_max_len check constraint

/**
 * The message input.
 *
 * States: empty (send disabled), typing, sending, and disabled — the last one
 * matters because a connection can be withdrawn while the thread is open, and
 * the server will reject the insert. Better to say so than to fail silently.
 */
export default function ChatComposer({ onSend, sending = false, disabled = false, disabledReason }) {
  const [value, setValue] = useState('');
  const [keyboardUp, setKeyboardUp] = useState(false);
  const safeBottom = useBottomInset();

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // The home-indicator inset only earns its space when the keyboard isn't
  // already covering it.
  const bottomInset = keyboardUp ? Space[8] : safeBottom;

  const canSend = value.trim().length > 0 && !sending && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const body = value.trim();
    setValue('');           // clear immediately; the bubble is optimistic
    onSend?.(body);
  }, [canSend, value, onSend]);

  if (disabled) {
    return (
      <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
        <Text style={styles.disabledNote}>
          {disabledReason || 'You can no longer message this person.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="Write a message"
          placeholderTextColor={Colors.text.placeholder}
          multiline
          maxLength={MAX_LENGTH}
          // Keep the OS font-size setting from blowing the composer out of the
          // layout, without ignoring it entirely.
          maxFontSizeMultiplier={1.4}
          textAlignVertical="center"
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
          style={[styles.send, canSend ? styles.sendActive : styles.sendIdle]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        
          hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
        >
          <ArrowUp
            size={20}
            strokeWidth={2.8}
            color={canSend ? Colors.text.onDark : Colors.text.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.subtle,
    backgroundColor: Colors.surface.page,
    paddingHorizontal: Space[16],
    paddingTop: Space[10],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space[8],
  },
  input: {
    flex: 1,
    // minHeight, not height: the box must grow with the text and with the
    // user's OS font-size setting.
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Space[16],
    paddingVertical: Platform.OS === 'ios' ? Space[12] : Space[8],
    backgroundColor: Colors.surface.soft,
    borderRadius: Radius[22] ?? 22,
    color: Colors.text.primary,
    fontFamily: FontFamilies.medium,
    fontSize: Type.bodyPrimary.fontSize,
    lineHeight: Type.bodyPrimary.lineHeight,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: Radius.full ?? 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: Colors.brand.primary },
  sendIdle:   { backgroundColor: Colors.surface.soft },

  disabledNote: {
    ...Type.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Space[12],
  },
});
