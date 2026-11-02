import { level0 } from './levels/level0';
import { createView } from './render/view';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const { scene, camera, renderer } = createView(level0);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
