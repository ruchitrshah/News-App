// The feed before there's any news: the same rail (just the +) and the same
// card, holding a prompt to make the first briefing. While the library is
// still loading from the pipeline server, the card shows the pixel loader
// instead, so a returning user never sees "nothing here" flash first.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import LoadingState from '../../components/loaders/LoadingState';
import { DEFAULT_ILLUSTRATION } from '../../data/illustrations';
import { Colors, Space } from '../../brand';
import { FeedColors } from '../../brand/Feed';
import { CARD, BAR_TOP_IN_CARD, useCardBottom } from '../layout';
import NewsRail from './NewsRail';
import { TITLE, BODY } from './type';

export default function EmptyFeed({ loading, connected = true, onCreate }) {
  const cardBottom = useCardBottom();
  return (
    <View style={styles.screen}>
      <NewsRail news={[]} selectedId={null} seenIds={new Set()} onSelect={() => {}} onCreate={onCreate} />
      <View style={[styles.card, { marginBottom: cardBottom }]}>
        <View style={[styles.body, { paddingBottom: BAR_TOP_IN_CARD }]}>
          {loading ? (
            <LoadingState label="Loading your briefings" />
          ) : (
            <>
              <Image source={DEFAULT_ILLUSTRATION} style={styles.art} resizeMode="contain" />
              <Text style={styles.title} accessibilityRole="header">
                No briefings yet
              </Text>
              <Text style={styles.body1}>
                {connected
                  ? 'Tap + or the mic and say a topic — Genie will research it and make your first briefing.'
                  : 'This version isn’t connected to a briefing server, so it can’t make stories. Run Genie with its server to try it — see the README.'}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: FeedColors.page },
  card: {
    flex: 1,
    marginHorizontal: CARD.marginX,
    borderRadius: CARD.radius,
    overflow: 'hidden',
    backgroundColor: Colors.surface.subtle,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[32], gap: Space[8] },
  art: { width: 72, height: 72, marginBottom: Space[8] },
  title: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  body1: { ...BODY, textAlign: 'center', color: Colors.text.secondary },
});
