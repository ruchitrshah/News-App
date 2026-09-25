// Art for a news item's pill and list row: a Thiings 3D icon picked from the
// topic (its label, then its first headline), so the rail reads at a glance
// instead of a row of identical globes. Anything unmatched gets the globe.
// All art is the 120px set (the full-size sources live beside them).
export const DEFAULT_ILLUSTRATION = require('../../assets/illustrations/globe-120.png');

const ART = [
  { art: require('../../assets/illustrations/gas-pump-120.png'), words: ['gas', 'fuel', 'petrol', 'oil', 'opec', 'energy'] },
  {
    art: require('../../assets/illustrations/bank-120.png'),
    words: ['bank', 'fed', 'rate', 'interest', 'inflation', 'market', 'stock', 'economy', 'jobs', 'tariff', 'dollar', 'crypto', 'bitcoin'],
  },
  {
    art: require('../../assets/illustrations/robot-120.png'),
    words: ['ai', 'openai', 'apple', 'meta', 'muse', 'chip', 'nvidia', 'google', 'robot', 'tech', 'model', 'vr', 'glasses'],
  },
  { art: require('../../assets/illustrations/shopping-cart-120.png'), words: ['shop', 'retail', 'commerce', 'amazon', 'walmart', 'checkout'] },
  { art: require('../../assets/illustrations/maple-leaf-120.png'), words: ['canada', 'climate', 'weather', 'niño', 'nino', 'storm', 'heat', 'wildfire'] },
];

const words = (text) => (text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

export function illustrationFor(news) {
  if (news?.illustration) return news.illustration;
  const topic = [news?.label, news?.stories?.[0]?.headline, news?.stories?.[0]?.cardHeadline];
  for (const text of topic) {
    const w = words(text);
    const hit = ART.find((a) => a.words.some((k) => w.includes(k)));
    if (hit) return hit.art;
  }
  return DEFAULT_ILLUSTRATION;
}
