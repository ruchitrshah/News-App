// The only two text styles in the app's content. Nothing is set bigger — not
// big numbers, not key facts, not your own spoken words. Emphasis comes from
// placement and colour, never from size.
//   TITLE  a headline, a key number, a transcript
//   BODY   everything under it — subtext, comparisons, dates, captions
import { FontFamilies } from '../../brand';

export const TITLE = { fontFamily: FontFamilies.demi, fontSize: 21, lineHeight: 27 };
export const BODY = { fontFamily: FontFamilies.medium, fontSize: 15, lineHeight: 22 };
