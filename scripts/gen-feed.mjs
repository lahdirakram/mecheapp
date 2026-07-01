#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-feed.mjs — PRIVATE admin script. Populates the Découvrir feed with
// AI-generated synthetic-model portraits.
//
// This is intentionally NOT an edge function: it has no public surface, so a
// user can never trigger paid Gemini calls. It runs on YOUR machine with the
// service-role key and writes new feed_items as `status='draft'`. Nothing is
// shown in the app until you review and flip a draft to 'published'.
//
// Pipeline per image:
//   pick an active haircut_catalog style  ->  sample a UNIQUE random person +
//   background (no repeated faces)  ->  Gemini text-to-image  ->  upload to the
//   public `feed` bucket  ->  insert a draft feed_items row (with the full
//   recipe in gen_meta so it is reproducible).
//
// SAFETY: dry-run by DEFAULT (no Gemini calls, no cost, no writes) — it prints
// the prompts it would send so you can eyeball them. Add --commit to actually
// generate. Batch is hard-capped (MAX_BATCH) and the Gemini call retries at most
// once, per the project's "cap paid AI calls" rule.
//
// Requires Node 22 (global fetch/crypto/Buffer). Run from the repo root.
//
//   export SUPABASE_URL=https://<ref>.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=<service-role key for that project>
//   export GEMINI_API_KEY=<key>                # only needed with --commit
//
//   node scripts/gen-feed.mjs                  # dry-run, 12 prompts, prints them
//   node scripts/gen-feed.mjs --count 24 --commit
//   node scripts/gen-feed.mjs --style curtain-shag --count 3 --commit
//
// Target the STAGING project first (vefxfjcdvstjwieasrbq), review, then prod
// (hqhnvjjbohzktoapsytj). The script writes to whichever SUPABASE_URL is set.
// ─────────────────────────────────────────────────────────────────────────────
import { fileURLToPath } from 'node:url';

const MAX_BATCH = 100;             // hard ceiling on images per run
const COST_PER_IMAGE_EUR = 0.04;   // matches GEN_COST_PER_LOOK_EUR
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-image';

// ── variation axes (the diversity sampler; lives here as config for v1) ───────
// High cardinality on purpose: the product of these is in the millions, so two
// images almost never share a face, and the dedupe below guarantees it.
// Heritage profiles: skin, eyes and NATURAL hair are drawn from the same profile so every person is
// internally coherent (no "Scandinavian + dark ebony", no green eyes on East Asian, etc.). Dyed
// colours (DYE) are layered on top occasionally, since hair dye is universal and on-trend.
export const HERITAGES = [
  { name: 'East Asian',        tex: ['straight'],                  skin: ['fair', 'light', 'light olive', 'warm honey'],                  eyes: ['dark brown', 'warm brown'],                              hair: ['natural black', 'soft black', 'dark brown'] },
  { name: 'Southeast Asian',   tex: ['straight', 'wavy'],          skin: ['light olive', 'golden tan', 'tan', 'warm brown'],              eyes: ['dark brown', 'warm brown'],                              hair: ['natural black', 'soft black', 'dark brown'] },
  { name: 'South Asian',       tex: ['straight', 'wavy', 'curly'], skin: ['light olive', 'olive', 'tan', 'warm brown', 'medium brown'],   eyes: ['dark brown', 'warm brown', 'hazel'],                     hair: ['natural black', 'dark brown', 'espresso brown'] },
  { name: 'Middle Eastern',    tex: ['wavy', 'curly', 'straight'], skin: ['light olive', 'olive', 'golden tan', 'tan'],                   eyes: ['dark brown', 'warm brown', 'hazel', 'green'],            hair: ['natural black', 'dark brown', 'chestnut brown'] },
  { name: 'Maghrebi',          tex: ['wavy', 'curly'],             skin: ['light olive', 'olive', 'golden tan', 'warm brown'],            eyes: ['dark brown', 'warm brown', 'hazel'],                     hair: ['natural black', 'dark brown', 'chestnut brown'] },
  { name: 'West African',      tex: ['coily'],                     skin: ['warm brown', 'medium brown', 'rich brown', 'deep brown', 'dark ebony'], eyes: ['dark brown', 'warm brown'],                     hair: ['natural black', 'soft black'] },
  { name: 'East African',      tex: ['coily', 'curly'],            skin: ['medium brown', 'rich brown', 'deep brown', 'dark ebony'],      eyes: ['dark brown', 'warm brown'],                              hair: ['natural black', 'soft black', 'dark brown'] },
  { name: 'Afro-Caribbean',    tex: ['coily', 'curly'],            skin: ['warm brown', 'medium brown', 'rich brown', 'deep brown'],      eyes: ['dark brown', 'warm brown', 'hazel'],                     hair: ['natural black', 'soft black', 'dark brown'] },
  { name: 'Mediterranean',     tex: ['wavy', 'curly', 'straight'], skin: ['light', 'light olive', 'olive', 'golden tan'],                 eyes: ['warm brown', 'hazel', 'green', 'dark brown'],            hair: ['dark brown', 'chestnut brown', 'espresso brown'] },
  { name: 'Southern European', tex: ['wavy', 'straight'],          skin: ['light', 'light olive', 'olive'],                               eyes: ['warm brown', 'hazel', 'green', 'dark brown'],            hair: ['dark brown', 'chestnut brown', 'warm chestnut'] },
  { name: 'Northern European', tex: ['straight', 'wavy'],          skin: ['fair', 'light'],                                               eyes: ['grey-blue', 'deep blue', 'green', 'hazel'],              hair: ['golden blonde', 'ash blonde', 'honey blonde', 'dark brown'] },
  { name: 'Scandinavian',      tex: ['straight', 'wavy'],          skin: ['fair', 'light'],                                               eyes: ['grey-blue', 'deep blue', 'green'],                       hair: ['platinum blonde', 'golden blonde', 'ash blonde'] },
  { name: 'Eastern European',  tex: ['straight', 'wavy'],          skin: ['fair', 'light'],                                               eyes: ['grey-blue', 'deep blue', 'green', 'hazel', 'warm brown'], hair: ['ash blonde', 'dark brown', 'chestnut brown'] },
  { name: 'Latin American',    tex: ['wavy', 'curly', 'straight'], skin: ['light olive', 'olive', 'golden tan', 'tan', 'warm brown'],     eyes: ['warm brown', 'dark brown', 'hazel'],                     hair: ['dark brown', 'chestnut brown', 'espresso brown', 'natural black'] },
  { name: 'Brazilian',         tex: ['wavy', 'curly', 'coily'],    skin: ['light olive', 'golden tan', 'tan', 'warm brown', 'medium brown'], eyes: ['warm brown', 'dark brown', 'hazel'],                  hair: ['dark brown', 'chestnut brown', 'natural black'] },
  { name: 'Pacific Islander',  tex: ['wavy', 'curly'],             skin: ['golden tan', 'tan', 'warm brown', 'medium brown'],             eyes: ['dark brown', 'warm brown'],                              hair: ['natural black', 'soft black', 'dark brown'] },
  { name: 'mixed-race',        tex: ['wavy', 'curly', 'coily'],    skin: ['light olive', 'golden tan', 'tan', 'warm brown', 'medium brown'], eyes: ['warm brown', 'hazel', 'green', 'dark brown'],         hair: ['dark brown', 'soft black', 'chestnut brown', 'natural black'] },
];
// Texture each cut needs. Anything not listed is 'versatile' (adapts to the person's natural texture).
export const STYLE_TEXTURE = {
  'blunt-bob': 'straight', 'french-bob': 'straight', 'italian-bob': 'straight', 'asymmetric-bob': 'straight',
  'sleek-straight-long': 'straight', 'french-crop': 'straight',
  'wavy-lob': 'wavy', 'mermaid-waves': 'wavy', 'nineties-blowout': 'wavy', 'butterfly-cut': 'wavy', 'curtain-bang-layers': 'wavy',
  'defined-curls': 'curly', 'curly-bob': 'curly', 'curly-shag': 'curly', 'afro-shapeup': 'coily',
};
// On-trend dyed colours that read plausibly on anyone (applied ~30% of the time).
export const DYE = ['caramel balayage', 'honey blonde', 'copper red', 'auburn', 'strawberry blonde', 'chocolate brown with subtle highlights', 'caramel brown', 'icy silver', 'platinum blonde'];
const COOL_BLEACH = new Set(['platinum blonde', 'icy silver', 'ash blonde']); // skip on curly/afro textures
const FACE_SHAPE = ['oval', 'round', 'square', 'heart-shaped', 'diamond', 'oblong', 'soft round'];
// (eye colour + natural hair colour now live in each heritage profile above)
const BACKGROUND = [
  'against a warm beige studio backdrop', 'against a soft grey studio gradient',
  'against a sand-toned seamless backdrop', 'against a muted sage-green wall', 'against a terracotta wall',
  'against a soft blush-pink studio backdrop', 'in front of a blurred cafe interior',
  'on a blurred city street with bokeh', 'against a minimal concrete wall', 'in a warm wood-toned interior',
  'against blurred botanical greenery', 'outdoors among blurred greenery',
  'against a clean off-white studio wall', 'against a deep teal backdrop', 'in a modern salon interior',
];
const LIGHTING = [
  'soft diffused studio lighting', 'warm golden-hour light', 'bright airy daylight',
  'gentle window light', 'soft cinematic side light', 'cool editorial lighting',
];
const EXPRESSION = [
  'a relaxed soft smile', 'a calm neutral expression', 'a confident gaze', 'a serene look',
  'a subtle warm smile', 'a natural candid laugh',
];
// Shot type / framing — varied on purpose so the feed reads like real photos, not
// centred headshots. Biased to upper-body and angles that actually show the cut.
const SHOT = [
  'natural waist-up lifestyle photo',
  'relaxed half-body photo at a three-quarter angle',
  'candid street-style photo from the waist up',
  'over-the-shoulder photo showing the hair from the side and back',
  'side-profile photo that shows the haircut shape',
  'three-quarter-length fashion photo',
  'candid photo glancing away, hair catching the light',
  'natural photo sitting at a cafe, upper body in frame',
];
// Mostly empty so most faces stay clean; a few add a distinguishing detail.
const DISTINCTIVE = ['', '', '', '', '', 'with light freckles across the nose', 'with a few natural freckles', 'with a small beauty mark', 'with subtle dimples'];

// ── pure helpers (exported for testing) ───────────────────────────────────────
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
export function sampleAge(range) {
  if (range) return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  const bands = [[18, 24, 3], [25, 34, 4], [35, 44, 3], [45, 59, 2], [60, 70, 1]];
  let r = Math.random() * bands.reduce((s, b) => s + b[2], 0);
  for (const [lo, hi, w] of bands) { if ((r -= w) < 0) return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  return 30;
}
export function moodFromLighting(l) {
  if (/golden|window/.test(l)) return 'warm';
  if (/cool|editorial/.test(l)) return 'cool';
  if (/airy|daylight/.test(l)) return 'sand';
  if (/cinematic|side/.test(l)) return 'night';
  return 'warm';
}
export function tagFromScore(s) {
  if (s >= 80) return { fr: 'TENDANCE', en: 'TRENDING' };
  if (s >= 68) return { fr: 'POPULAIRE', en: 'POPULAR' };
  return { fr: 'NOUVEAU', en: 'NEW' };
}
export const fakeLoves = () => `${(1.5 + Math.random() * 28).toFixed(1)}k`;

// Which heritages can wear a cut naturally: curly/coily cuts must land on curly/coily-natural hair;
// straight/wavy/versatile cuts can go on anyone (styled as needed).
function heritagesFor(cutTex) {
  if (cutTex === 'coily') return HERITAGES.filter((h) => h.tex.includes('coily'));
  if (cutTex === 'curly') return HERITAGES.filter((h) => h.tex.includes('curly') || h.tex.includes('coily'));
  return HERITAGES;
}
// How a cut is achieved when its texture differs from the person's natural texture.
function stylingNote(visible, natural) {
  if (visible === natural) return '';
  if (visible === 'straight') return natural === 'wavy' ? 'blow-dried smooth and straight' : 'sleek and silk-pressed straight';
  if (visible === 'wavy') return natural === 'straight' ? 'curled into soft waves' : 'styled into soft loose waves';
  return 'defined with a soft perm';
}

// Sample one unique person+scene for a style; resamples until the combo is fresh.
export function sampleUnique(style, seen, ageRange) {
  const cutTex = STYLE_TEXTURE[style.slug] ?? 'versatile';
  const pool = heritagesFor(cutTex);
  for (let attempt = 0; attempt < 12; attempt++) {
    const h = pick(pool);
    const naturalTex = pick(h.tex);
    const visibleTex = cutTex === 'versatile' ? naturalTex : cutTex; // versatile cuts adopt her texture
    // colour: a style colour pins it; else ~30% on-trend dye, else a natural colour for the heritage.
    // Cool-bleach tones (platinum/icy/ash) stay off curly/coily textures on both paths (harsh there).
    const noBleach = (list) => (visibleTex === 'coily' || visibleTex === 'curly' ? list.filter((c) => !COOL_BLEACH.has(c)) : list);
    const naturalPool = noBleach(h.hair);
    const hairColor = style.color_hint || (Math.random() < 0.3 ? pick(noBleach(DYE)) : pick(naturalPool.length ? naturalPool : h.hair));
    // texture phrase: versatile cuts state her natural texture; texture-specific cuts add a styling
    // note only when they differ from it (the "allow, describe as styled" rule, e.g. a silk press).
    const texturePhrase =
      cutTex === 'versatile' ? `, worn in her natural ${naturalTex} texture`
        : visibleTex !== naturalTex ? `, ${stylingNote(visibleTex, naturalTex)}`
          : '';
    const s = {
      gender: 'woman', // B2C feed is women-only; every catalog cut is shown on a woman
      age: sampleAge(ageRange),
      heritage: h.name,
      skinTone: pick(h.skin),
      faceShape: pick(FACE_SHAPE),
      eyeColor: pick(h.eyes),
      hairColor,
      naturalTex,
      visibleTex,
      texturePhrase,
      background: pick(BACKGROUND),
      lighting: pick(LIGHTING),
      expression: pick(EXPRESSION),
      distinctive: pick(DISTINCTIVE),
      shot: pick(SHOT),
    };
    const combo = [style.slug, s.gender, s.age, s.heritage, s.skinTone, s.faceShape, s.eyeColor, s.hairColor, s.visibleTex, s.background, s.shot].join('|');
    if (!seen.has(combo)) { seen.add(combo); return { sample: s, combo }; }
  }
  return null; // space exhausted for this style (won't happen at sane batch sizes)
}

export function buildPrompt(style, s, aspectRatio = '3:4') {
  const feature = s.distinctive ? `, ${s.distinctive}` : '';
  const colorPart = style.color_hint ? `, coloured ${style.color_hint}` : `, in ${s.hairColor}`;
  return [
    `Photorealistic, candid, true-to-life photo of a ${s.age}-year-old ${s.gender} of ${s.heritage} heritage,`,
    `with ${s.skinTone} skin, ${article(s.faceShape)} ${s.faceShape} face, ${s.eyeColor} eyes${feature}.`,
    `${cap(s.shot)}.`,
    `Their hair is styled as ${style.prompt_hint}${s.texturePhrase}${colorPart}.`,
    `${cap(s.expression)}. ${cap(s.background)}. ${cap(s.lighting)}.`,
    `The hairstyle is clearly visible and in sharp focus. Shot on a 35mm camera, shallow depth of field, natural skin texture. This is a real-life candid photo, not a studio headshot.`,
    `Vertical ${aspectRatio} framing, full-frame composition with the subject placed naturally off-centre.`,
    `The subject is a unique, entirely fictional individual, clearly distinct from any other person. A single woman, clearly and recognisably feminine. No text, no watermark, no logos.`,
  ].join(' ');
}

// ── Supabase REST (zero-dependency) ───────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const REST = `${SUPABASE_URL}/rest/v1`;
const sbHeaders = () => ({ apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' });
async function sbGet(path) {
  const r = await fetch(`${REST}/${path}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`supabase GET ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
}
async function sbInsert(table, row) {
  const r = await fetch(`${REST}/${table}`, { method: 'POST', headers: { ...sbHeaders(), prefer: 'return=representation' }, body: JSON.stringify(row) });
  if (!r.ok) throw new Error(`supabase INSERT ${table} -> ${r.status}: ${await r.text()}`);
  return (await r.json())[0];
}
async function sbUpload(path, bytes, contentType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/feed/${path}`, {
    method: 'POST',
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': contentType, 'x-upsert': 'true' },
    body: bytes,
  });
  if (!r.ok) throw new Error(`storage upload -> ${r.status}: ${await r.text()}`);
}
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/feed/${path}`;

// ── Gemini text-to-image (same REST shape as functions/_shared/tryon.ts) ──────
async function generateImage(prompt, aspectRatio) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
  };
  const call = async () => {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
    const j = await res.json();
    const parts = j?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData || p.inline_data);
    const data = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!data) throw new Error('no image in response');
    const mime = img?.inlineData?.mimeType ?? img?.inline_data?.mime_type ?? 'image/png';
    return { data, mime };
  };
  try {
    return await call();
  } catch (e) {
    // Retry AT MOST ONCE on recoverable errors — every call is paid, so the retry is strictly bounded.
    const m = String(e?.message ?? e);
    if (!/no image|RESOURCE_EXHAUSTED|429|50\d/.test(m)) throw e;
    await sleep(500);
    return await call();
  }
}

// Bounded-concurrency runner so we never fire the whole batch at Gemini at once.
async function pool(items, n, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  }));
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  if (has('--help') || has('-h')) {
    console.log('Usage: node scripts/gen-feed.mjs [--count N] [--age 25-35] [--ratio 3:4] [--commit] [--style <slug>] [--concurrency N] [--no-loves]');
    console.log('  default is a DRY RUN (prints prompts, no cost). Add --commit to generate.');
    return;
  }
  const COMMIT = has('--commit');
  const WITH_LOVES = !has('--no-loves');
  const STYLE_FILTER = val('--style', null);
  const CONCURRENCY = Math.max(1, Math.min(6, Number(val('--concurrency', '3')) || 3));
  const RATIO = val('--ratio', '3:4');
  let COUNT = Math.max(1, Number(val('--count', '12')) || 12);
  if (COUNT > MAX_BATCH) { console.warn(`! --count ${COUNT} exceeds MAX_BATCH ${MAX_BATCH}; clamping.`); COUNT = MAX_BATCH; }

  const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
  if (!SUPABASE_URL) die('SUPABASE_URL is not set.');
  if (!SERVICE) die('SUPABASE_SERVICE_ROLE_KEY is not set.');
  if (COMMIT && !GEMINI_API_KEY) die('GEMINI_API_KEY is required with --commit.');
  const RATIOS = ['1:1', '3:4', '4:5', '9:16', '4:3', '16:9', '2:3', '3:2', '5:4', '21:9'];
  if (!RATIOS.includes(RATIO)) die(`--ratio "${RATIO}" not supported. Use one of: ${RATIOS.join(', ')}`);

  // Optional age interval, e.g. --age 25-35 or --age 28. Floored at 18 (no synthetic minors).
  const AGE = val('--age', null);
  let ageRange = null;
  if (AGE) {
    const m = AGE.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
    if (!m) die(`--age "${AGE}" is invalid. Use e.g. --age 25-35 or --age 28.`);
    let lo = Number(m[1]);
    let hi = m[2] ? Number(m[2]) : lo;
    if (hi < lo) [lo, hi] = [hi, lo];
    if (lo < 18) { console.warn('! --age minimum is 18 (no minors); raising to 18.'); lo = 18; }
    if (hi > 90) hi = 90;
    ageRange = { min: lo, max: hi };
  }

  const host = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
  console.log(`\nMèche feed generator  ·  project ${host}  ·  ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);

  let styleQuery = 'haircut_catalog?active=eq.true&select=id,slug,name,descr,prompt_hint,hair,color_hint,trending_score';
  if (STYLE_FILTER) styleQuery += `&slug=eq.${encodeURIComponent(STYLE_FILTER)}`;
  const styles = await sbGet(styleQuery);
  if (!styles.length) die(STYLE_FILTER ? `No active style with slug "${STYLE_FILTER}". Did you run migration 0014?` : 'haircut_catalog is empty. Push migration 0014 first.');

  // Preload combos already generated so separate runs don't repeat each other.
  const seen = new Set();
  try {
    const prior = await sbGet('feed_items?select=gen_meta&catalog_id=not.is.null&order=created_at.desc&limit=2000');
    for (const row of prior) { const c = row?.gen_meta?.combo; if (c) seen.add(c); }
    if (seen.size) console.log(`(${seen.size} existing combos preloaded for de-duplication)\n`);
  } catch { /* best-effort */ }

  // Even, varied spread: round-robin a shuffled style list so the feed feels broad.
  const rotation = shuffle(styles);
  const plan = [];
  for (let i = 0; i < COUNT; i++) {
    const style = rotation[i % rotation.length];
    const u = sampleUnique(style, seen, ageRange);
    if (!u) continue;
    plan.push({ style, sample: u.sample, combo: u.combo, prompt: buildPrompt(style, u.sample, RATIO) });
  }

  if (!COMMIT) {
    plan.forEach((p, i) => {
      console.log(`#${String(i + 1).padStart(2, '0')}  [${p.style.slug}]  ${p.sample.gender}, ${p.sample.age}, ${p.sample.heritage}, ${p.sample.visibleTex}  ·  ${p.sample.shot}`);
      console.log(`     ${p.prompt}\n`);
    });
    console.log(`Dry run: ${plan.length} unique prompts at ${RATIO}${ageRange ? `, ages ${ageRange.min}-${ageRange.max}` : ''}, 0 generated.`);
    console.log(`Estimated cost to commit: ~€${(plan.length * COST_PER_IMAGE_EUR).toFixed(2)} (${plan.length} × €${COST_PER_IMAGE_EUR}).`);
    console.log(`Re-run with --commit to generate.\n`);
    return;
  }

  console.log(`Generating ${plan.length} images at ${RATIO}${ageRange ? `, ages ${ageRange.min}-${ageRange.max}` : ''}  ·  est. ~€${(plan.length * COST_PER_IMAGE_EUR).toFixed(2)}  ·  concurrency ${CONCURRENCY}\n`);
  let ok = 0;
  const fails = [];
  await pool(plan, CONCURRENCY, async (p, idx) => {
    const label = `#${String(idx + 1).padStart(2, '0')} [${p.style.slug}]`;
    try {
      const img = await generateImage(p.prompt, RATIO);
      const ext = img.mime.includes('png') ? 'png' : 'jpg';
      const path = `studio/${crypto.randomUUID()}.${ext}`;
      await sbUpload(path, Buffer.from(img.data, 'base64'), img.mime);
      await sbInsert('feed_items', {
        kind: 'studio',
        status: 'draft',
        catalog_id: p.style.id,
        name: p.style.name,
        descr: p.style.descr,
        tag: tagFromScore(p.style.trending_score),
        hair: p.style.hair,
        mood: moodFromLighting(p.sample.lighting),
        loves: WITH_LOVES ? fakeLoves() : null,
        label: { fr: 'STUDIO MÈCHE', en: 'MÈCHE STUDIO' },
        by: { fr: 'Référence éditoriale', en: 'Editorial reference' },
        match: null,
        image_url: publicUrl(path),
        gen_meta: { source: 'gen-feed', model: GEMINI_MODEL, aspectRatio: RATIO, combo: p.combo, prompt: p.prompt, axes: p.sample, cost_eur: COST_PER_IMAGE_EUR },
      });
      ok++;
      console.log(`  ✓ ${label}  ${p.sample.gender}, ${p.sample.age}, ${p.sample.heritage}`);
    } catch (e) {
      const msg = String(e?.message ?? e);
      fails.push({ label, msg });
      console.log(`  ✗ ${label}  ${msg.slice(0, 120)}`);
    }
  });

  console.log(`\nDone. ${ok} draft(s) created, ${fails.length} failed.  Actual cost ≈ €${(ok * COST_PER_IMAGE_EUR).toFixed(2)}.`);
  console.log('Review them, then publish:');
  console.log(`  update feed_items set status='published' where status='draft' and catalog_id is not null;`);
  console.log('(or approve selectively by id). Drafts stay hidden from the app until then.\n');
}

// Run only when executed directly, so tests can import the pure helpers above.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`✗ ${e?.message ?? e}`); process.exit(1); });
}
