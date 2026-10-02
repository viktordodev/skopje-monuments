import { CircleGeometry, ConeGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, TorusGeometry } from 'three';
import { box, cyl, lathe, mesh } from '../kit';
import { cvs, tex } from '../textures';
import type { Kit } from '../kit';
import type { BuildContext, Monument } from './types';

/**
 * The Clock Tower of the Old Bazaar: a hexagonal shaft, stone below and red brick above (rebuilt in
 * 1904), clocks on alternate faces, a railed balcony, a two-tier belfry of arched openings and a
 * white onion dome. 37 m in reality. Its clocks keep real Skopje time.
 */
const HEX = 6;

export function buildClockTower(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'clock-tower';

  const hex = (rTop: number, rBot: number, h: number, y: number, mat: MeshStandardMaterial, tile = 3) => {
    const m = mesh(cyl(rTop, rBot, h, HEX, tile), mat);
    m.position.y = y + h / 2;
    m.geometry.computeVertexNormals();
    g.add(m);
    return m;
  };
  // Flat-shade the hexagon: re-split the cylinder so each face has its own normal.
  const faceNormal = (m: Mesh) => {
    m.geometry = m.geometry.toNonIndexed();
    m.geometry.computeVertexNormals();
  };

  faceNormal(hex(3.35, 3.5, 1.2, 0, kit.paleStone));
  faceNormal(hex(3.25, 3.35, 8.3, 1.2, kit.stone));
  faceNormal(hex(3.38, 3.38, 0.5, 9.5, kit.paleStone));
  faceNormal(hex(2.95, 3.15, 16.3, 10, kit.brick));
  faceNormal(hex(3.2, 3.0, 0.7, 26.3, kit.brick));
  faceNormal(hex(3.65, 3.65, 0.35, 27, kit.paleStone));
  faceNormal(hex(2.25, 2.35, 3.4, 27.35, kit.brick));
  faceNormal(hex(2.5, 2.5, 0.3, 30.75, kit.brick));
  faceNormal(hex(2.0, 2.1, 2.6, 31.05, kit.brick));
  faceNormal(hex(2.3, 2.3, 0.35, 33.65, kit.paleStone));

  // onion dome and finial
  const dome = mesh(
    lathe([[0, 34], [2.05, 34], [2.35, 34.6], [2.35, 35.3], [1.9, 36.1], [1.0, 36.8], [0.35, 37.3], [0.12, 37.8], [0, 38.1]], 32, 4, 2),
    kit.plaster,
  );
  g.add(dome);
  const rod = mesh(cyl(0.06, 0.06, 1.5, 6), kit.iron);
  rod.position.y = 38.6;
  const crescent = mesh(new TorusGeometry(0.35, 0.06, 6, 16, Math.PI * 1.4), kit.iron);
  crescent.position.y = 39.4;
  crescent.rotation.z = Math.PI * 0.8;
  g.add(rod, crescent);

  // balcony railing: posts and a rail
  const railPosts = new InstancedMesh(cyl(0.04, 0.04, 1.1, 5), kit.iron, 36);
  const o = new Object3D();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    o.position.set(Math.sin(a) * 3.45, 27.9, Math.cos(a) * 3.45);
    o.updateMatrix();
    railPosts.setMatrixAt(i, o.matrix);
  }
  const rail = new Mesh(new TorusGeometry(3.45, 0.05, 4, 6), kit.iron);
  rail.rotation.x = Math.PI / 2;
  rail.rotation.z = Math.PI / 6;
  rail.position.y = 28.45;
  g.add(railPosts, rail);

  // arched openings of the belfry (lit from inside at night) and slit windows down the shaft
  const archTex = archMask();
  const openingMat = new MeshStandardMaterial({ color: 0x120c0c, emissive: kit.windowGlow.emissive, emissiveMap: archTex, alphaMap: archTex, transparent: true, roughness: 1 });
  kit.nightLights.push({ mat: openingMat, day: 0.25, night: 2.6 });
  const openings = new InstancedMesh(new PlaneGeometry(1, 1), openingMat, HEX * 3 + HEX * 3);
  let n = 0;
  const onFace = (face: number, apothem: number, y: number, w: number, h: number) => {
    const a = (face / HEX) * Math.PI * 2 + Math.PI / HEX;
    o.position.set(Math.sin(a) * (apothem + 0.03), y, Math.cos(a) * (apothem + 0.03));
    o.rotation.set(0, a, 0);
    o.scale.set(w, h, 1);
    o.updateMatrix();
    openings.setMatrixAt(n++, o.matrix);
  };
  const ap = (r: number) => r * Math.cos(Math.PI / HEX);
  for (let f = 0; f < HEX; f++) {
    onFace(f, ap(2.3), 29.1, 1.1, 2.3);
    onFace(f, ap(2.05), 32.35, 0.9, 1.7);
    onFace(f, ap(3.1) - 0.1, 18 + (f % 2) * 3, 0.45, 1.3);
    if (f % 2 === 0) onFace(f, ap(3.25), 5.5, 0.55, 1.6);
    else onFace(f, ap(3.02), 22.5, 0.45, 1.2);
    onFace(f, ap(3.05), 14, 0.4, 1.1);
  }
  openings.count = n;
  g.add(openings);

  // three clocks on alternate faces, keeping Skopje time
  const clockFace = new MeshStandardMaterial({ map: dialTexture(), emissive: 0xfff3dc, emissiveMap: null, emissiveIntensity: 0, roughness: 0.6 });
  kit.nightLights.push({ mat: clockFace, day: 0, night: 0.9 });
  const hands: { hour: Object3D; minute: Object3D }[] = [];
  for (const f of [0, 2, 4]) {
    const a = (f / HEX) * Math.PI * 2 + Math.PI / HEX;
    const holder = new Group();
    holder.position.set(Math.sin(a) * (ap(3.0) + 0.06), 24.7, Math.cos(a) * (ap(3.0) + 0.06));
    holder.rotation.y = a;
    const face = new Mesh(new CircleGeometry(1.05, 40), clockFace);
    const frame = new Mesh(new TorusGeometry(1.08, 0.07, 6, 40), kit.iron);
    const hour = handMesh(kit, 0.55, 0.07);
    const minute = handMesh(kit, 0.85, 0.05);
    hour.position.z = 0.03;
    minute.position.z = 0.05;
    holder.add(face, frame, hour, minute);
    hands.push({ hour, minute });
    g.add(holder);
  }

  // a few bazaar houses at its foot, for scale
  houses(g, kit);

  return {
    group: g,
    update() {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Skopje', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? now.getHours());
      const m = Number(parts.find((p) => p.type === 'minute')?.value ?? now.getMinutes()) + now.getSeconds() / 60;
      for (const hd of hands) {
        hd.minute.rotation.z = -(m / 60) * Math.PI * 2;
        hd.hour.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2;
      }
    },
  };
}

function handMesh(kit: Kit, len: number, w: number) {
  const pivot = new Group();
  const m = new Mesh(box(w, len, 0.02, 1), kit.iron);
  m.position.y = len / 2 - 0.08;
  pivot.add(m);
  return pivot;
}

function dialTexture() {
  const S = 256;
  const c = cvs(S, S);
  const x = c.getContext('2d')!;
  x.fillStyle = '#f4efe4';
  x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2);
  x.fillStyle = '#1b1b1b';
  for (let i = 0; i < 12; i++) {
    x.save();
    x.rotate((i / 12) * Math.PI * 2);
    x.fillRect(-3, -S * 0.46, 6, i % 3 === 0 ? 26 : 16);
    x.restore();
  }
  return tex(c, true, false);
}

/** Round-headed opening as an alpha mask. */
function archMask() {
  const c = cvs(64, 128);
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(4, 128);
  x.lineTo(4, 32);
  x.arc(32, 32, 28, Math.PI, 0);
  x.lineTo(60, 128);
  x.closePath();
  x.fill();
  return tex(c, false, false);
}

function houses(g: Group, kit: Kit) {
  const spots: [number, number, number, number, number][] = [
    [-11, -6, 7, 6, 0.2],
    [10, -4, 8, 5.5, -0.15],
    [-13, 7, 6, 5, 0.5],
    [13, 8, 6.5, 6, -0.4],
    [0, -14, 9, 6.5, 0.05],
  ];
  for (const [x, z, w, h, r] of spots) {
    const house = new Group();
    const walls = mesh(box(w, h, w * 0.8, 3), kit.plaster);
    walls.position.y = h / 2;
    const roof = mesh(new ConeGeometry(w * 0.78, h * 0.45, 4, 1), kit.roof);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;
    roof.position.y = h + h * 0.22;
    const win = new Mesh(new PlaneGeometry(1, 1.4), kit.windowGlow);
    win.position.set(w * 0.2, h * 0.55, w * 0.4 + 0.02);
    const win2 = win.clone();
    win2.position.x = -w * 0.2;
    house.add(walls, roof, win, win2);
    house.position.set(x, 0, z);
    house.rotation.y = r;
    g.add(house);
  }
}
