import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Cake,
  User,
  Ruler,
  MapPin,
  Star,
  Wine,
  Briefcase,
  Home,
  Languages,
  Heart,
  Church,
} from './AppIcons';

import { useProfileStore } from '../store/profileStore';
import { cardSurface } from './card';

import {
  Colors,
  Space,
  Radius,
  Type,
  FontFamilies,
  FontSizes,
  LineHeights,
} from '../brand';

const CardStack = () => {
  const profile = useProfileStore();

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const horizontalChips = [
    { icon: Cake, value: calculateAge(profile.dateOfBirth), show: !!profile.dateOfBirth },
    { icon: User, value: profile.gender, show: !!profile.gender },
    { icon: Ruler, value: profile.heightFeet ? `${profile.heightFeet}' ${profile.heightInches}"` : null, show: !!profile.heightFeet },
    { icon: MapPin, value: profile.currentCity, show: !!profile.currentCity },
    { icon: Star, value: profile.sect, show: !!profile.sect },
    { icon: Church, value: profile.religion, show: !!profile.religion },
    { icon: Wine, value: profile.diet?.[0], show: (profile.diet?.length ?? 0) > 0 },
  ].filter((chip) => chip.show && chip.value);

  const verticalItems = [
    { icon: Briefcase, value: profile.occupations?.[0]?.occupationTitle || profile.occupationTitle, show: !!(profile.occupations?.[0]?.occupationTitle || profile.occupationTitle) },
    { icon: Home, value: `${profile.currentCity || ''}${profile.currentCity && profile.currentState ? ', ' : ''}${profile.currentState || ''}`.trim(), show: !!(profile.currentCity || profile.currentState) },
    { icon: Languages, value: profile.primaryLanguages?.[0] || profile.languages?.[0], show: !!(profile.primaryLanguages?.[0] || profile.languages?.[0]) },
    { icon: Heart, value: 'Life partner', show: true },
  ].filter((item) => item.show && item.value);

  return (
    <View style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {horizontalChips.map((chip, index) => (
          <View key={`${chip.value}-${index}`} style={styles.chip}>
            <chip.icon size={18} color={Colors.icon.primary} strokeWidth={2} />
            <Text style={styles.chipText}>{chip.value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.verticalList}>
        {verticalItems.map((item, index) => (
          <View key={`${item.value}-${index}`} style={styles.listItem}>
            <View style={styles.iconContainer}>
              <item.icon size={22} color={Colors.icon.secondary} strokeWidth={2} />
            </View>
            <Text style={styles.listItemText} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    paddingTop: Space[30],
    paddingBottom: Space[30],
    paddingHorizontal: Space[16],
  },

  horizontalScroll: { marginBottom: Space[30] },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.soft,
    borderRadius: Radius[24],
    paddingVertical: Space[10],
    paddingHorizontal: Space[16],
    marginRight: Space[10],
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },

  chipText: {
    ...Type.chip,
    marginLeft: Space[8],
  },

  verticalList: { gap: Space[16] },
  listItem: { flexDirection: 'row', alignItems: 'center' },

  iconContainer: {
    width: Space[44],
    height: Space[44],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Space[14],
  },

  listItemText: {
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[17],
    lineHeight: LineHeights[24],
    color: Colors.text.primary,
    flex: 1,
  },
});

export default CardStack;
