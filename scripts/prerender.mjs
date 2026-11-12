// Fills dist/index.html with the server-rendered first paint and the <head> tags (title, description,
// Open Graph/Twitter, JSON-LD), so the name, title, summary, every project and every link are in the
// static HTML for search engines, link previews and no-JS visitors.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ssrDir = join(root, '.ssr');
const { render, headTags } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

// Netlify sets URL to the site's main address at build time
const siteUrl = process.env.SITE_URL ?? process.env.URL ?? 'https://fahmiadyportofolio.netlify.app';
const file = join(root, 'dist/index.html');
const html = readFileSync(file, 'utf8');
for (const marker of ['<!--app-html-->', '<!--head-tags-->']) {
  if (!html.includes(marker)) throw new Error(`dist/index.html has no ${marker} marker`);
}
writeFileSync(file, html.replace('<!--head-tags-->', headTags(siteUrl)).replace('<!--app-html-->', render()));
rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerender: dist/index.html filled in for ${siteUrl}`);
