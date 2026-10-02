import { DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { cvs, tex } from './textures';

/**
 * The giant wordmark standing in the landscape, as in the hero of Kage: each letter is its own
 * plane so it can rise out of the valley on arrival and drift apart as you leave the hero.
 */
export class Wordmark {
  readonly group = new Group();
  private readonly letters: { mesh: Mesh; mat: MeshBasicMaterial; baseX: number; baseY: number; i: number }[] = [];

  constructor(word: string, height: number) {
    const SZ = 320;
    const PAD = 24;
    const font = `400 ${SZ}px 'Manrope Variable', 'Manrope', system-ui, sans-serif`;
    const m = cvs(4, 4).getContext('2d')!;
    m.font = font;
    const track = SZ * 0.34;
    const glyphs = [...word].map((ch) => {
      const t = m.measureText(ch);
      return { ch, w: t.width, asc: t.actualBoundingBoxAscent, desc: t.actualBoundingBoxDescent, l: t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight };
    });
    const asc = Math.max(...glyphs.map((g) => g.asc));
    const total = glyphs.reduce((s, g) => s + g.w, 0) + track * (glyphs.length - 1);
    const scale = height / asc;
    let pen = -total / 2;
    glyphs.forEach((g, i) => {
      const cw = Math.ceil(g.l + g.r) + PAD * 2;
      const ch = Math.ceil(g.asc + g.desc) + PAD * 2;
      const c = cvs(cw, ch);
      const x = c.getContext('2d')!;
      x.font = font;
      const grad = x.createLinearGradient(0, PAD, 0, PAD + asc);
      grad.addColorStop(0, 'rgba(255,244,226,1)');
      grad.addColorStop(0.55, 'rgba(255,230,202,0.96)');
      grad.addColorStop(1, 'rgba(255,210,180,0.86)');
      x.fillStyle = grad;
      x.fillText(g.ch, PAD + g.l, PAD + g.asc);
      const mat = new MeshBasicMaterial({ map: tex(c, true, false), transparent: true, depthWrite: false, side: DoubleSide, fog: true, opacity: 0 });
      const mesh = new Mesh(new PlaneGeometry(cw * scale, ch * scale), mat);
      const baseX = (pen + g.w / 2) * scale;
      const baseY = ((g.asc - g.desc) / 2) * scale;
      mesh.position.set(baseX, baseY, 0);
      mesh.renderOrder = 8;
      this.group.add(mesh);
      this.letters.push({ mesh, mat, baseX, baseY, i });
      pen += g.w + track;
    });
  }

  /**
   * `intro` 0→1 raises the letters out of the ground one by one; `leave` 0→1 lifts and spreads them
   * as the hero scrolls away.
   */
  update(intro: number, leave: number, time: number, tint: { r: number; g: number; b: number }) {
    const n = this.letters.length;
    for (const L of this.letters) {
      const d = L.i / Math.max(1, n - 1);
      const t = MathUtils.clamp((intro - d * 0.35) / 0.65, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const spread = (d - 0.5) * 2;
      const lv = MathUtils.smoothstep(leave, 0, 1);
      L.mesh.position.x = L.baseX * (1 + lv * 0.35);
      L.mesh.position.y = L.baseY - (1 - e) * 60 + lv * (40 + Math.abs(spread) * 30) + Math.sin(time * 0.6 + L.i) * 0.8;
      L.mesh.rotation.y = lv * spread * 0.5;
      L.mat.opacity = e * (1 - lv) * 0.9;
      L.mat.color.setRGB(tint.r, tint.g, tint.b);
      L.mesh.visible = L.mat.opacity > 0.002;
    }
  }
}
