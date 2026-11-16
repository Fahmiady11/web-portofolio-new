// <head> tags built from the content, put into dist/index.html by scripts/prerender.mjs.
import { latestJob, site } from '../content/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function headTags(siteUrl: string) {
  const url = siteUrl.replace(/\/$/, '') + '/';
  const title = `${site.name} — ${site.headline}`;
  const description = `${site.name} is a ${site.headline} based in ${site.location}. ` +
    `Step into a noir detective office where every piece of evidence opens part of the portfolio: projects, experience, skills and certificates.`;
  const image = url + 'og.jpg';
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.headline,
    // only a job that is still ongoing counts as worksFor
    ...(latestJob.latest ? { worksFor: { '@type': 'Organization', name: latestJob.company } } : {}),
    address: { '@type': 'PostalAddress', addressLocality: site.location },
    email: 'mailto:' + site.email,
    image: url.replace(/\/$/, '') + site.photo.src,
    url,
    sameAs: site.socials.map((s) => s.url),
  };
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="${esc(site.name)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="A noir detective office at night with a lit CASE FILES wall of project photos">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${image}">
    <script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`;
}
