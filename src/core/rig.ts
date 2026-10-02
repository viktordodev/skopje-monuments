import { CatmullRomCurve3, MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { Shot } from '../stage/layout';

/**
 * Flies the camera through the shots like a crane on rails. `u` is the continuous station index.
 * Between chapters the path is a smooth spline; the frame shift slides the subject to the side
 * opposite the story text. A hand-held drift follows the pointer, and on arrival a long dolly eases in.
 */
export class Rig {
  private readonly pos: CatmullRomCurve3;
  private readonly look: CatmullRomCurve3;
  private readonly last: number;
  private readonly p = new Vector3();
  private readonly l = new Vector3();
  private readonly d = new Vector3();
  private readonly right = new Vector3();
  private mx = 0;
  private my = 0;
  readonly focus = new Vector3();
  shift = 0;

  /**
   * @param ground height of the drawn ground (or water) under a point; the camera never drops below it plus
   * a clearance, whatever the portrait step-back, the spline between shots or the hand-held drift do.
   */
  constructor(
    private readonly shots: Shot[],
    private readonly parallax: boolean,
    private readonly ground: (x: number, z: number) => number = () => -Infinity,
  ) {
    this.pos = new CatmullRomCurve3(shots.map((s) => s.pos.clone()), false, 'catmullrom', 0.4);
    this.look = new CatmullRomCurve3(shots.map((s) => s.look.clone()), false, 'catmullrom', 0.4);
    this.last = shots.length - 1;
  }

  /** Eases each leg so the camera settles on a monument and moves briskly between them. */
  private ease(u: number) {
    const i = Math.floor(u);
    const f = u - i;
    const e = MathUtils.lerp(f, f * f * (3 - 2 * f), 0.7);
    return MathUtils.clamp(i + e, 0, this.last);
  }

  update(camera: PerspectiveCamera, u: number, pointer: { x: number; y: number }, dt: number, intro: number, portrait: number) {
    const ue = this.ease(MathUtils.clamp(u, 0, this.last));
    const t = ue / this.last;
    this.pos.getPoint(t, this.p);
    this.look.getPoint(t, this.l);
    const i = MathUtils.clamp(Math.floor(ue), 0, this.last - 1);
    const f = ue - i;
    let fov = MathUtils.lerp(this.shots[i].fov, this.shots[i + 1].fov, f);
    this.shift = MathUtils.lerp(this.shots[i].shift, this.shots[i + 1].shift, f) * (1 - portrait);
    // lift over anything standing between two shots (the camera crosses the bridge's deck, not its abutment)
    const hop = (this.shots[i].hop ?? 0) * Math.sin(f * Math.PI);
    this.p.y += hop;
    this.l.y += hop * 0.5;

    // portrait frames step back (level, so a camera looking up at a tower is not driven into the ground)
    // and widen a little instead of cropping
    if (portrait > 0) {
      this.d.subVectors(this.p, this.l).setY(0).normalize();
      this.p.addScaledVector(this.d, portrait * 30);
      this.p.y += portrait * 4;
      fov *= 1 + portrait * 0.35;
    }

    // the opening dolly: from further back and higher, on a longer lens
    const io = 1 - intro;
    this.d.subVectors(this.p, this.l).normalize();
    this.p.addScaledVector(this.d, io * 70);
    this.p.y += io * 14;
    fov -= io * 6;

    const k = 1 - Math.exp(-dt * 2.5);
    this.mx += ((this.parallax ? pointer.x : 0) - this.mx) * k;
    this.my += ((this.parallax ? pointer.y : 0) - this.my) * k;
    camera.position.copy(this.p);
    camera.lookAt(this.l);
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(this.right, this.mx * 3.2);
    // up raises the camera; down only dips the view, so a hand tilting the phone never sinks it into the ground
    camera.position.y += Math.max(this.my, 0) * 1.8;
    this.l.y += Math.min(this.my, 0) * 2.4;
    this.l.addScaledVector(this.right, -this.mx * 1.2);
    // keep clear of the ground under the camera and just ahead of it (a rising slope in front fills a
    // close view as badly as being under it)
    this.d.subVectors(this.l, camera.position).setY(0).normalize();
    const c = camera.position;
    const floor =
      Math.max(this.ground(c.x, c.z), this.ground(c.x + this.d.x * 4, c.z + this.d.z * 4), this.ground(c.x + this.d.x * 9, c.z + this.d.z * 9)) + 2.2;
    if (c.y < floor) c.y = floor;
    camera.lookAt(this.l);
    // a slow breathing drift so the frame is never quite still
    camera.rotateZ(Math.sin(performance.now() / 4200) * 0.004);
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    this.focus.copy(this.l);
  }
}
