// Fills dist/index.html with the server-rendered first paint and the <head> tags (title, description,
// Open Graph/Twitter, JSON-LD), so the name, title, summary, every project and every link are in the
// static HTML for search engines, link previews and no-JS visitors.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ssrDir = join(root, '.ssr');
const { render, headTags } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

// The site's public address for canonical and Open Graph URLs; SITE_URL overrides it (e.g. for a staging copy)
const siteUrl = process.env.SITE_URL ?? 'https://portofolio.asfahmidev.com';
const file = join(root, 'dist/index.html');
const html = readFileSync(file, 'utf8');
for (const marker of ['<!--app-html-->', '<!--head-tags-->']) {
  if (!html.includes(marker)) throw new Error(`dist/index.html has no ${marker} marker`);
}
// the name in the header is the largest text on first paint: fetch its typewriter face right away
const font = readdirSync(join(root, 'dist/assets')).find((f) => /^special-elite-latin-400-normal-.*\.woff2$/.test(f));
if (!font) throw new Error('Special Elite woff2 not found in dist/assets');
const preload = `<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin>`;
writeFileSync(file, html.replace('<!--head-tags-->', preload + headTags(siteUrl)).replace('<!--app-html-->', render()));
rmSync(ssrDir, { recursive: true, force: true });
// one page: a one-entry sitemap, announced in robots.txt
const page = siteUrl.replace(/\/$/, '') + '/';
writeFileSync(join(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${page}</loc></url></urlset>\n`);
writeFileSync(join(root, 'dist/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${page}sitemap.xml\n`);
console.log(`prerender: dist/index.html, sitemap.xml and robots.txt filled in for ${siteUrl}`);
