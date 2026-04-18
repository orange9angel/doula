import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Low-angle shot (looking up) — adds drama / heroism.
 */
export class LowAngle extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 1.2 });
    this.targetPos = parseVecOption(options.targetPos, new THREE.Vector3(0, 1.5, 0));
    this.distance = options.distance ?? 4;
  }

  start(camera, context) {
    super.start(camera, context);
    this.startPos = camera.position.clone();
    // End position: low, looking up toward target
    this.endPos = new THREE.Vector3(
      this.targetPos.x + (Math.random() - 0.5) * 0.5,
      this.targetPos.y - 1.0,
      this.targetPos.z + this.distance
    );
  }

  update(t, camera, context) {
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(this.startPos, this.endPos, eased);
    camera.lookAt(this.targetPos);
  }
}
