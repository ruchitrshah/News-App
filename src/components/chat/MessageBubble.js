import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, CheckCheck, RotateCw } from 'lucide-react-native';

import { Colors, Space, Radius, Type } from '../../brand';

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * One message.
 *
 * Ticks follow the convention people already know from every other messenger:
 * one tick = it reached the server, two blue = the other person has read it.
 * Only shown on your own messages — a tick on someone else's is meaningless.
 */
export default function MessageBubble({ message, isMine, onRetry }) {
  const { body, createdAt, readAt, pending, failed } = message;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          failed && styles.bubbleFailed,
        ]}
      >
        <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>
          {body}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
            {timeLabel(createdAt)}
          </Text>

          {isMine && !failed ? (
            pending ? (
              <Check size={13} color="rgba(255,255,255,0.55)" strokeWidth={3} />
            ) : readAt ? (
              <CheckCheck size={13} color={TICK_READ} strokeWidth={3} />
            ) : (
              <CheckCheck size={13} color="rgba(255,255,255,0.55)" strokeWidth={3} />
            )
          ) : null}
        </View>
      </View>

      {failed ? (
        <TouchableOpacity
          style={styles.retry}
          onPress={() => onRetry?.(message)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RotateCw size={13} color={Colors.status?.danger ?? '#B91C1C'} strokeWidth={2.5} />
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// The one genuinely "blue" thing in a navy-and-white app — it has to read as
// a distinct state, not as brand colour.
const TICK_READ = '#4EA1FF';

const styles = StyleSheet.create({
  row: {
    marginBottom: Space[8],
    paddingHorizontal: Space[16],
    maxWidth: '100%',
  },
  rowMine:   { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: Space[14],
    paddingVertical: Space[10],
    borderRadius: Radius[18] ?? 18,
  },
  bubbleMine: {
    backgroundColor: Colors.brand.primary,
    borderBottomRightRadius: Radius[6] ?? 6,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface.soft,
    borderBottomLeftRadius: Radius[6] ?? 6,
  },
  bubbleFailed: { opacity: 0.6 },

  body: { ...Type.bodyPrimary },
  bodyMine:   { color: Colors.text.onDark },
  bodyTheirs: { color: Colors.text.primary },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Space[4],
    marginTop: Space[2],
  },
  time: { ...Type.caption, fontSize: 11 },
  timeMine:   { color: 'rgba(255,255,255,0.6)' },
  timeTheirs: { color: Colors.text.tertiary },

  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    marginTop: Space[4],
  },
  retryText: { ...Type.caption, color: Colors.status?.danger ?? '#B91C1C' },
});
