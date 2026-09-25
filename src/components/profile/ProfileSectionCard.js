// src/components/profile/ProfileSectionCard.js
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

// Standardized imports using your centralized brand index
import { Colors, Space, Type } from '../../brand';

// Correct relative path to the card surface helper
import { cardSurface } from '../card'; 

/**
 * Does this row have anything to show?
 *
 * Shared with ProfileOptionRow so the row and the card can never disagree
 * about which rows exist — the card needs the answer to work out which one is
 * genuinely last, and the row needs it to decide whether to draw at all.
 */
export function rowHasValue(props = {}) {
  const filled = (v) => !!String(v ?? '').trim();
  return (
    filled(props.subtitle) ||
    filled(props.thirdLine) ||
    filled(props.fourthLine) ||
    (!!props.titleIsValue && filled(props.title))
  );
}

// Rows are the only children that carry both an icon and a title.
const isRowLike = (child) =>
  React.isValidElement(child) &&
  child.props?.icon !== undefined &&
  child.props?.title !== undefined;

export default function ProfileSectionCard({ title, children, style }) {
  // Drop the rows that have nothing to show, THEN decide which one is last.
  //
  // `isLast` used to be computed at the call site from the raw field, so when a
  // row hid itself the row above had already been told it wasn't last and drew
  // a divider into empty space. Deciding here — after the empty rows are gone —
  // makes the divider a consequence of what actually rendered.
  //
  // Reading child.props rather than rendering is what makes this possible: an
  // element that will return null is still a truthy element until it renders.
  const visible = React.Children.toArray(children).filter(
    (child) => !isRowLike(child) || rowHasValue(child.props)
  );

  if (visible.length === 0) return null;

  const lastRowIndex = visible.reduce(
    (acc, child, i) => (isRowLike(child) ? i : acc),
    -1
  );

  const rendered = visible.map((child, i) =>
    isRowLike(child)
      ? React.cloneElement(child, { isLast: i === lastRowIndex })
      : child
  );

  return (
    <View style={[styles.card, style]}>
      {title ? (
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      ) : null}
      {rendered}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    backgroundColor: Colors.surface.page,
    marginHorizontal: Space[16],
    marginTop: Space[16],
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[28],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  sectionTitle: {
    ...Type.sectionHeader, 
    marginTop: 0, 
    marginBottom: Space[12],
  },
});