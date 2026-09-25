import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors, Space, Radius, Type, FontFamilies } from '../../brand';

const AVATAR = 56;

function dayLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ConversationRow({ conversation, currentUserId, onPress }) {
  const {
    otherUserName,
    otherUserPhotoPath,
    lastMessagePreview,
    lastMessageAt,
    lastMessageSenderId,
    unreadCount,
  } = conversation;

  const unread = unreadCount > 0;
  const initial = (otherUserName || '?').trim().charAt(0).toUpperCase();
  const sentByMe = lastMessageSenderId && lastMessageSenderId === currentUserId;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${otherUserName || 'connection'}${
        unread ? `, ${unreadCount} unread` : ''
      }`}
    >
      {otherUserPhotoPath ? (
        <Image source={{ uri: otherUserPhotoPath }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {otherUserName || 'Baarat connection'}
          </Text>
          <Text style={[styles.time, unread && styles.timeUnread]}>
            {dayLabel(lastMessageAt)}
          </Text>
        </View>

        <View style={styles.bottomLine}>
          <Text
            style={[styles.preview, unread && styles.previewUnread]}
            numberOfLines={1}
          >
            {lastMessagePreview
              ? `${sentByMe ? 'You: ' : ''}${lastMessagePreview}`
              : 'Say hello'}
          </Text>

          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingVertical: Space[12],
    paddingHorizontal: Space[16],
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: Radius.full ?? 9999,
    backgroundColor: Colors.surface.soft,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...Type.cardTitle, color: Colors.text.tertiary },

  body: { flex: 1, gap: Space[4] },

  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space[8],
  },
  name: {
    ...Type.primaryValue,
    flex: 1,
    color: Colors.text.secondary,
    fontFamily: FontFamilies.medium,
  },
  nameUnread: {
    color: Colors.text.primary,
    fontFamily: FontFamilies.bold,
  },

  time: { ...Type.caption, color: Colors.text.tertiary },
  timeUnread: { color: Colors.brand.primary, fontFamily: FontFamilies.bold },

  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space[8],
  },
  preview: { ...Type.bodyTertiaryTight, flex: 1, color: Colors.text.tertiary },
  previewUnread: {
    color: Colors.text.primary,
    fontFamily: FontFamilies.demi,
  },

  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: Space[6],
    borderRadius: Radius.full ?? 9999,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...Type.caption,
    color: Colors.brand.onPrimary ?? Colors.text.onDark,
    fontSize: 12,
  },
});
