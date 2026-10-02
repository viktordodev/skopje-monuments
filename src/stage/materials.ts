import {
  Color,
  DoubleSide,
  MeshStandardMaterial,
  Vector3,
  type MeshStandardMaterialParameters,
  type Texture,
} from 'three';
import type { Surface } from './textures';

/**
 * Every lit surface shares one "sunset rim": a fresnel edge glow tinted by the sun and strongest on
 * edges that face it, so backlit monuments read as silhouettes outlined in light.
 */
export const RIM = {
  uRimColor: { value: new Color(1, 0.6, 0.3) },
  uRimStrength: { value: 1 },
  uSunView: { value: new Vector3(0, 0, -1) },
};

export interface StyleOpts extends MeshStandardMaterialParameters {
  surface?: Surface;
  repeat?: [number, number];
  bumpScale?: number;
  /** Multiplier on the shared rim for this material (bronze glints more than plaster). */
  rim?: number;
}

export function stylized(o: StyleOpts): MeshStandardMaterial {
  const { surface, repeat, bumpScale, rim = 1, ...params } = o;
  const m = new MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...params });
  if (surface) {
    const map = surface.map.clone();
    const bump = surface.bump.clone();
    if (repeat) {
      map.repeat.set(...repeat);
      bump.repeat.set(...repeat);
    }
    map.needsUpdate = bump.needsUpdate = true;
    m.map = map;
    m.bumpMap = bump;
    m.bumpScale = bumpScale ?? 1.2;
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = RIM.uRimColor;
    shader.uniforms.uRimStrength = RIM.uRimStrength;
    shader.uniforms.uSunView = RIM.uSunView;
    shader.uniforms.uRimMat = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColor; uniform float uRimStrength; uniform vec3 uSunView; uniform float uRimMat;',
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 V = normalize(vViewPosition);
          float fres = pow(1.0 - saturate(dot(normal, V)), 3.0);
          float toward = saturate(dot(normal, uSunView) * 0.8 + 0.35);
          outgoingLight += uRimColor * fres * toward * uRimStrength * uRimMat;
        }
        #include <opaque_fragment>`,
      );
  };
  // Materials with the same rim share one program.
  m.customProgramCacheKey = () => 'rim';
  return m;
}

/** Unlit glow (windows, lamps, the cross at night); intensity is driven per frame. */
export function glow(color: string | number, intensity = 1, map?: Texture) {
  return new MeshStandardMaterial({
    color: 0x000000,
    emissive: new Color(color),
    emissiveIntensity: intensity,
    emissiveMap: map ?? null,
    roughness: 1,
    side: DoubleSide,
  });
}
