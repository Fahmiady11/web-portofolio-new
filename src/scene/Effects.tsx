// Bloom on the bright things only (the CASE FILES neon, the lamp bulb, the HOTEL sign), then the same ACES
// tone mapping the renderer applies without effects. Skipped on low quality.
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEffect } from 'react';
import { liveQuality } from './quality';

export default function Effects() {
  useEffect(() => {
    liveQuality.bloom = true;
    return () => { liveQuality.bloom = false; };
  }, []);
  return (
    <EffectComposer multisampling={4}>
      {/* only HDR values above 1 glow: everything lit normally stays crisp */}
      <Bloom mipmapBlur luminanceThreshold={1.25} luminanceSmoothing={0.1} intensity={0.85} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
