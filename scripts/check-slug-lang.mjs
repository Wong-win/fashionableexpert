#!/usr/bin/env node
/**
 * Build-time guard: fail the build when an article slug is written in the
 * wrong language for the site, or when slugs collide / contain CJK.
 *
 * Usage (from a site directory):  node ../scripts/check-slug-lang.mjs
 * Wire it as "prebuild" in the site's package.json.
 *
 * Config:  slug-lang-sites.json  (site dir name -> "fr" | "en")
 * Escape hatch:  <site>/slug-lang-allowlist.txt  (one slug or slug prefix per line)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const siteDir = process.cwd();
const siteName = path.basename(siteDir);

// ---- language config -------------------------------------------------------
// SITE_LANG wins (set in package.json prebuild); otherwise fall back to the
// shared slug-lang-sites.json when this copy lives in Astroweb/scripts.
let siteLang = process.env.SITE_LANG;
if (!siteLang) {
  const configPath = path.join(HERE, 'slug-lang-sites.json');
  if (fs.existsSync(configPath)) {
    siteLang = JSON.parse(fs.readFileSync(configPath, 'utf8'))[siteName];
  }
}
if (siteLang !== 'fr' && siteLang !== 'en') {
  console.error(`[slug-lang] cannot determine site language for "${siteName}" — set SITE_LANG=fr|en`);
  process.exit(1);
}

// ---- vocabulary ------------------------------------------------------------
// Only words that are strongly tied to one language. Cross-lingual words
// (style, cuisine, guide, mode, travel, plus, zero, festival, hotel, ...) are
// deliberately excluded — they caused most of the false positives in the
// one-off audit.
const STRONG_FR = new Set(`pour avec dans sans sous vers chez votre vos notre nos leur leurs comment pourquoi quelle quelles quels quel meilleur meilleure meilleurs meilleures idees conseils astuces tendances facons decouvrez devoile devez pouvez doivent nous vous mais tres tout tous toute toutes sont etre ete avoir fait plus deja quand ainsi aussi entre chaque plusieurs peut elle ils elles dont quoi qui que ceci cela celui celle ceux celles`.split(/\s+/));
const WEAK_FR = new Set(`le la les de des du un une et en au aux sur par est son sa ses ce cette ces`.split(/\s+/));
const STRONG_EN = new Set(`the and with your for how what why when where which whose from about into over after before between should would could have has had been will can need needs things ways tips best you are were was there their they this that these those not but all more very just also must our its tell`.split(/\s+/));
const WEAK_EN = new Set(`of to in at by is it we my he she his her him us do does did if out off one new three use`.split(/\s+/));

function score(tokens, lang) {
  let s = 0;
  for (const t of tokens) {
    if (lang === 'fr') {
      if (STRONG_FR.has(t)) s += 1;
      else if (WEAK_FR.has(t)) s += 0.5;
    } else {
      if (STRONG_EN.has(t)) s += 1;
      else if (WEAK_EN.has(t)) s += 0.5;
    }
  }
  return s;
}

// ---- allowlist -------------------------------------------------------------
const allowPath = path.join(siteDir, 'slug-lang-allowlist.txt');
const allow = [];
if (fs.existsSync(allowPath)) {
  for (const line of fs.readFileSync(allowPath, 'utf8').split('\n')) {
    const v = line.split('#')[0].trim();
    if (v) allow.push(v);
  }
}
const isAllowed = (slug) => allow.some((a) => slug === a || slug.startsWith(a));

// ---- collect articles ------------------------------------------------------
const articleDir = path.join(siteDir, 'src/content/articles');
if (!fs.existsSync(articleDir)) {
  console.error(`[slug-lang] no article directory: ${articleDir}`);
  process.exit(1);
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function readSlug(filePath, fileName, fm) {
  const m = fm.match(/^(slug|postSlug)\s*:\s*["']?([^"'\n]+?)["']?\s*$/m);
  if (m) return { slug: m[2].trim(), source: m[1] };
  return { slug: fileName.replace(/\.mdx?$/, ''), source: 'filename' };
}

const files = fs.readdirSync(articleDir).filter((f) => /\.mdx?$/.test(f));
const seen = new Map();
const problems = [];

for (const f of files) {
  const full = path.join(articleDir, f);
  const text = fs.readFileSync(full, 'utf8');
  const { slug, source } = readSlug(full, f, frontmatter(text));

  if (!slug) {
    problems.push({ kind: 'empty', file: f, slug, detail: 'slug is empty' });
    continue;
  }
  if (/[　-鿿＀-￯]/.test(slug)) {
    problems.push({ kind: 'cjk', file: f, slug, detail: 'slug contains CJK characters' });
  }
  if (seen.has(slug)) {
    problems.push({ kind: 'duplicate', file: f, slug, detail: `duplicate of ${seen.get(slug)}` });
  } else {
    seen.set(slug, f);
  }

  if (isAllowed(slug)) continue;

  const tokens = slug.toLowerCase().split(/[-_\s]+/).filter(Boolean);
  const fr = score(tokens, 'fr');
  const en = score(tokens, 'en');
  const wrong = siteLang === 'en' ? fr : en;
  const own = siteLang === 'en' ? en : fr;
  if (wrong >= 2 && own === 0) {
    problems.push({
      kind: 'language',
      file: f,
      slug,
      detail: `${siteLang === 'en' ? 'French' : 'English'}-looking slug on a ${siteLang.toUpperCase()} site (fr=${fr} en=${en}, source=${source})`,
    });
  }
}

// ---- report ----------------------------------------------------------------
if (problems.length === 0) {
  console.log(`[slug-lang] ${siteName} (${siteLang}): ${files.length} articles OK`);
  process.exit(0);
}

console.error(`\n[slug-lang] ${siteName} (${siteLang}): ${problems.length} problem(s) in ${files.length} articles\n`);
for (const p of problems) {
  console.error(`  ✗ [${p.kind}] ${p.file}`);
  console.error(`      slug: ${p.slug}`);
  console.error(`      ${p.detail}`);
}
console.error(`\nFix the slugs, or add a deliberate exception to:
  ${allowPath}\n`);
process.exit(1);
