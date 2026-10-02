import './style.css';
import { hasWebGL } from './core/webgl';

const root = document.documentElement;
// Tells the inline failsafe in <head> that the app script arrived.
(window as unknown as { __skopjeBoot: boolean }).__skopjeBoot = true;

if (hasWebGL()) {
  root.classList.add('webgl');
  // The 3D engine is a separate chunk: the story (real HTML) paints first, the scene follows.
  import('./core/App')
    .then(({ start }) => start())
    .catch((err) => {
      console.error(err);
      root.classList.remove('webgl');
      root.classList.add('no-webgl', 'no-js-scene');
    });
} else {
  root.classList.add('no-webgl', 'no-js-scene');
}
