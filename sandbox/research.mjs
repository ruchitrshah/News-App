// Sandbox CLI for the research gatekeeper (server/pipeline/research.mjs) —
// same code the app's pipeline server runs, all on the FAL_KEY.
//
//   node sandbox/research.mjs "Fed rate decision" [--days 7] [--out sandbox/fed-rates]
//
// Writes <out>/story.json — the full Story Intelligence result: intent, gate,
// information graph, verified media, and the storyboard of cards.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { configureFal } from '../server/pipeline/llm.mjs';
import { buildStory } from '../server/pipeline/research.mjs';

const env = Object.fromEntries(
  (await readFile('.env', 'utf8'))
    .split('\n')
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
if (!env.FAL_KEY) throw new Error('FAL_KEY missing from .env');
configureFal(env.FAL_KEY);

const args = process.argv.slice(2);
const flag = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const topic = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))).join(' ').trim();
if (!topic) {
  console.error('Usage: node sandbox/research.mjs "<topic>" [--days 7] [--out sandbox/<slug>]');
  process.exit(1);
}
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const OUT = flag('--out', path.join('sandbox', slug));
await mkdir(OUT, { recursive: true });

const r = await buildStory({ topic, days: Number(flag('--days', 7)), onStage: (s) => console.log('[stage]', s) });
await writeFile(path.join(OUT, 'story.json'), JSON.stringify(r, null, 2));
console.log(`[cost] $${r.cost.toFixed(3)} · intent: ${r.intent?.story_type} (${r.intent?.intent})`);

if (r.status !== 'ready') {
  console.log(`[gate] ${r.status.toUpperCase()} — ${r.message}`);
  console.log('[gate] Try instead:', (r.suggestions || []).join(' · '));
  process.exit(0);
}
console.log(`[graph] ${r.intelligence.key_facts.length} facts · ${r.intelligence.numbers.length} numbers kept (dropped ${r.dropped.facts} facts, ${r.dropped.numbers} numbers)`);
console.log(`[media] ${r.media_candidates.length} verified: ${r.media_candidates.map((m) => `${m.type}@${m.source}`).join(', ') || 'none'}`);
console.log(`[story] ${r.label} — ${r.headline}`);
for (const c of r.cards) {
  const what = c.media ? ` [${c.media.type} · ${c.media.source}${c.media.title ? ` · ${c.media.title}` : ''}]` : c.number ? ` [${c.number.value} ${c.number.unit}]` : '';
  console.log(`  ${c.sequence}. ${c.format.padEnd(15)} ${c.headline} — ${c.caption}${what}${c.generation_reason ? ` (why generate: ${c.generation_reason})` : ''}`);
}
console.log(`[done] ${OUT}/story.json · generation required: ${r.generation_required}`);
