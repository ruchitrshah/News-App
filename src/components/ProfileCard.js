import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { CircleCheck, CircleX } from './AppIcons';
import { MessageCircle, UserCircle } from 'lucide-react-native';
import { useProfileDerived } from '../hooks/useProfileDerived';
import { Colors, Space, Type, scaleSpace as s } from '../brand';
import Button from '../components/Button';


// Card photo is a 0.85 aspect slab of the live viewport width, so it keeps its
// proportions from a 320dp budget phone up to a tablet.
const PHOTO_ASPECT = 0.85;
const AVATAR_SIZE  = s(36);
// Larger than the old 36 so it balances a two-line block whose first line is
// now a name at cardTitle rather than a label at body size.
const ROW_AVATAR_SIZE = s(44);


function ProfileAvatar({ profile, size = AVATAR_SIZE }) {
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? '?';
  return profile?.photoUrl ? (
    <Image
      source={{ uri: profile.photoUrl }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}


function LikerCard({ profile, likeId, status, declinedByMe = true, onPress, onAccept, onReject, onDismiss, onSendMessage, sendingMessage }) {
  const { width: windowWidth } = useWindowDimensions();
  const photoHeight = Math.round(windowWidth * PHOTO_ASPECT);
  const { bioSnapshot, fullName, calculatedAge } = useProfileDerived(profile || {});
  const firstName = profile?.firstName ?? 'this person';

  // The card used to lead with a photo and a paragraph, so you had to read
  // prose to work out who someone was. These are the same facts the profile
  // header shows, in the order people scan them.
  const height = profile?.heightFeet
    ? `${profile.heightFeet}' ${profile.heightInches || 0}"`
    : null;
  const meta = [calculatedAge, height, profile?.currentCity]
    .filter(Boolean)
    .join('  ·  ');

  // Pending, accepted, and rejected invites share the same full profile card.
  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={[styles.photoWrap, { height: photoHeight }]}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{firstName[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.infoBlock}>
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          {!!fullName && (
            <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          )}
          {!!meta && (
            <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          )}
        </TouchableOpacity>

        {!!bioSnapshot && (
          <Text style={[Type.bodySecondary, styles.bio]} numberOfLines={2}>{bioSnapshot}</Text>
        )}

        {!!(!status || status === 'pending') && (
          <View style={styles.actionRow}>
            <Button
              variant="outline"
              onPress={() => onReject?.(likeId)}
              haptic="light"
              style={styles.action}
            >
              <View style={styles.actionContent}>
                {/* Lighter stroke than the bare glyphs used: the added ring
                    reads heavier at the same weight. */}
                <CircleX size={17} color={Colors.text.primary} strokeWidth={2} />
                <Text style={styles.actionTextSecondary}>Decline</Text>
              </View>
            </Button>

            <Button
              variant="primary"
              onPress={() => onAccept?.(likeId)}
              haptic="medium"
              style={styles.action}
            >
              <View style={styles.actionContent}>
                <CircleCheck
                  size={17}
                  color={Colors.brand.onPrimary ?? Colors.text.onDark}
                  strokeWidth={2}
                />
                <Text style={styles.actionTextPrimary}>Accept</Text>
              </View>
            </Button>
          </View>
        )}

        {(status === 'accepted' || status === 'rejected') && (
          <Button
            variant="primary"
            onPress={() => status === 'rejected' ? onPress?.() : onSendMessage?.(profile)}
            haptic="medium"
            disabled={status === 'accepted' && sendingMessage}
            style={styles.fullWidthAction}
          >
            <View style={styles.sendMessageContent}>
              {status === 'rejected' ? (
                <UserCircle
                  size={17}
                  color={Colors.brand.onPrimary ?? Colors.text.onDark}
                  strokeWidth={2.2}
                />
              ) : (
                <MessageCircle
                  size={16}
                  color={Colors.brand.onPrimary ?? Colors.text.onDark}
                  strokeWidth={2.2}
                />
              )}
              <Text style={styles.sendMessageText}>
                {status === 'rejected'
                  ? 'View Profile'
                  : (sendingMessage ? 'Opening…' : 'Send Message')}
              </Text>
            </View>
          </Button>
        )}
      </View>
    </View>
  );
}


export default function ProfileCard({
  profile, likeId, status, declinedByMe,
  onPress, onAccept, onReject, onDismiss,
  onSendMessage, sendingMessage,
  likedAt, showLikeActions,   // legacy
}) {
  return (
    <LikerCard
      profile={profile}
      likeId={likeId}
      declinedByMe={declinedByMe}
      status={status}
      onPress={onPress}
      onAccept={onAccept}
      onReject={onReject}
      onDismiss={onDismiss}
      onSendMessage={onSendMessage}
      sendingMessage={sendingMessage}
    />
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card ?? Colors.surface.subtle,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: s(Space[16]),
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  photoWrap: {
    width: '100%',
    backgroundColor: Colors.surface.soft,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.soft,
  },
  photoInitial: { ...Type.primaryValue, color: Colors.text.tertiary },

  infoBlock: {
    padding: s(Space[16]),
    gap: s(Space[8]),
  },
  name: { ...Type.cardTitle },
  meta: { ...Type.hint, color: Colors.text.tertiary, marginTop: s(Space[2]) },
  bio:  { color: Colors.text.secondary },

  actionRow: { flexDirection: 'row', gap: s(Space[10]), marginTop: s(Space[8]) },
  action:    { flex: 1 },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(Space[6]),
  },
  actionTextSecondary: { ...Type.button, color: Colors.text.primary },
  actionTextPrimary:   { ...Type.button, color: Colors.brand.onPrimary ?? Colors.text.onDark },
  fullWidthAction: { width: '100%', marginTop: s(Space[4]) },

  sendMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(Space[8]),
  },
  sendMessageText: { ...Type.button, color: Colors.brand.onPrimary ?? Colors.text.onDark },

  // ── Rejected row ──────────────────────────────────────────────────────────
  rejectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.subtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: s(Space[16]),
    overflow: 'hidden',
  },
  rejectedInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(Space[12]),
    paddingVertical: s(Space[12]),
    paddingLeft: s(Space[16]),
  },
  rejectedTextBlock: { flex: 1, gap: s(Space[2]) },
  // The same two tokens the photo card uses for name and meta — that is what
  // makes this read as the same family rather than a different component.
  // bodySecondary is deliberately not reused here: it carries its own
  // marginTop, which pushed the old title off the avatar's centre line.
  rejectedName:    { ...Type.cardTitle },
  rejectedOutcome: { ...Type.hint, color: Colors.text.tertiary },
  rejectedViewButton: {
    minHeight: 40,
    marginRight: s(Space[4]),
    paddingHorizontal: s(Space[10]),
  },

  // X dismiss button — 44px touch target always, no scaling
  dismissIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(Space[4]),
  },

  avatar: { backgroundColor: Colors.surface.soft },
  avatarFallback: {
    backgroundColor: Colors.surface.soft,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...Type.hint, color: Colors.text.tertiary },
});
