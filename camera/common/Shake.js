import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';

/**
 * Camera shake with decay. Useful for impact / chaos moments.
 */
export class Shake extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 0.6 });
    this.intensity = options.intensity ?? 0.25;
  }

  start(camera, context) {
    super.start(camera, context);
    this.basePos = camera.position.clone();
  }

  update(t, camera, context) {
    const decay = 1 - t;
    const i = this.intensity * decay;
    camera.position.set(
      this.basePos.x + (Math.random() - 0.5) * i,
      this.basePos.y + (Math.random() - 0.5) * i,
      this.basePos.z + (Math.random() - 0.5) * i
    );
  }

  end(camera, context) {
    super.end(camera, context);
    camera.position.copy(this.basePos);
  }
}
