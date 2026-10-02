/**
 * Phone tilt as a parallax input: writes into the same {x, y} the mouse drives on desktop, but with more
 * swing (`GAIN`), since a phone's portrait camera stands further back and a desktop-sized drift is lost.
 * The resting angle is learned and follows the hand slowly (a time constant of several seconds), so
 * however the phone is held that becomes centre, while a tilt still holds long enough to be seen.
 * iOS only grants motion sensors from a tap; the request is retried on each tap until it is answered.
 */
const RANGE = 14; // degrees of tilt for a full swing
const GAIN = 1.6; // swing relative to the mouse's full range
const SETTLE = 6; // seconds for the neutral angle to catch up with how the phone is held

export function listenTilt(target: { x: number; y: number }) {
  let base: { b: number; g: number } | null = null;
  let last = 0;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    const b = e.beta;
    const g = e.gamma;
    const now = e.timeStamp || performance.now();
    if (!base) base = { b, g };
    const dt = last ? Math.min(0.5, (now - last) / 1000) : 0;
    last = now;
    const k = 1 - Math.exp(-dt / SETTLE);
    base.b += (b - base.b) * k;
    base.g += (g - base.g) * k;
    const db = b - base.b;
    const dg = g - base.g;
    const angle = screen.orientation?.angle ?? 0;
    let x = dg;
    let y = -db;
    if (angle === 90) [x, y] = [db, dg];
    else if (angle === 270 || angle === -90) [x, y] = [-db, -dg];
    target.x = Math.max(-1, Math.min(1, x / RANGE)) * GAIN;
    target.y = Math.max(-1, Math.min(1, y / RANGE)) * GAIN;
  };

  const start = () => addEventListener('deviceorientation', onOrient);
  const Orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
  if (!Orientation) return;
  if (typeof Orientation.requestPermission === 'function') {
    // a scroll's touchend is not a gesture iOS accepts, so keep offering on taps until it is answered
    const ask = () => {
      Orientation.requestPermission!()
        .then((state) => {
          removeEventListener('click', ask);
          removeEventListener('touchend', ask);
          if (state === 'granted') start();
        })
        .catch(() => {});
    };
    addEventListener('click', ask);
    addEventListener('touchend', ask);
  } else {
    start();
  }
  // re-learn the centre after the phone is turned
  screen.orientation?.addEventListener('change', () => (base = null));
}
