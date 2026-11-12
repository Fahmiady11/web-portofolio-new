import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
export { headTags } from './seo/head';

/** The first paint as static HTML: header, the full dossier (hidden until opened) and the empty panel. */
export function render() {
  return renderToString(<StrictMode><App /></StrictMode>);
}
