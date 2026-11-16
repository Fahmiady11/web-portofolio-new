import { Component, lazy, Suspense, type ReactNode } from 'react';
import { MODELS, type ModelName } from './models';

// GLTFLoader and the meshopt decoder are only downloaded when at least one model exists
const Model = lazy(() => import('./Model'));

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('Model failed to load, using the procedural object:', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * The modelled .glb for a room piece when there is one, otherwise (and while it loads, or if it fails)
 * the procedural object given as children. Models are authored in room coordinates, so no transform here.
 */
export function Swappable({ model, children }: { model: ModelName; children: ReactNode }) {
  const url = MODELS[model];
  if (!url) return children;
  return (
    <Fallback fallback={children}>
      <Suspense fallback={children}>
        <Model name={model} url={url} />
      </Suspense>
    </Fallback>
  );
}
