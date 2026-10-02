/**
 * Phone tilt as a parallax input: writes into the same {x, y} (each about -1..1) the mouse drives on desktop.
 * The resting angle is learned and slowly follows the hand, so however the phone is held, that is centre.
 * iOS only grants motion sensors after a tap, so permission is asked on the first one.
 */
export function listenTilt(target: { x: number; y: number }) {
  const RANGE = 16; // degrees of tilt for a full swing
  let base: { b: number; g: number } | null = null;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    const b = e.beta;
    const g = e.gamma;
    if (!base) base = { b, g };
    // drift the neutral angle toward how the phone is being held (a few seconds to settle)
    base.b += (b - base.b) * 0.015;
    base.g += (g - base.g) * 0.015;
    const db = b - base.b;
    const dg = g - base.g;
    const angle = screen.orientation?.angle ?? 0;
    let x = dg;
    let y = -db;
    if (angle === 90) [x, y] = [db, dg];
    else if (angle === 270 || angle === -90) [x, y] = [-db, -dg];
    target.x = Math.max(-1, Math.min(1, x / RANGE));
    target.y = Math.max(-1, Math.min(1, y / RANGE));
  };

  const start = () => addEventListener('deviceorientation', onOrient);
  const Orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
  if (!Orientation) return;
  if (typeof Orientation.requestPermission === 'function') {
    const ask = () => {
      Orientation.requestPermission!()
        .then((state) => state === 'granted' && start())
        .catch(() => {});
    };
    addEventListener('touchend', ask, { once: true });
  } else {
    start();
  }
  // re-learn the centre after the phone is turned
  screen.orientation?.addEventListener('change', () => (base = null));
}
