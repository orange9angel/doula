import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Dolly zoom (push in) toward a target.
 */
export class ZoomIn extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 1.5 });
    this.targetPos = parseVecOption(options.targetPos, new THREE.Vector3(0, 1.5, 0));
    this.distance = options.distance ?? 3.5;
  }

  start(camera, context) {
    super.start(camera, context);
    this.startPos = camera.position.clone();
    const dir = new THREE.Vector3()
      .subVectors(camera.position, this.targetPos)
      .normalize();
    this.endPos = dir.multiplyScalar(this.distance).add(this.targetPos);
  }

  update(t, camera, context) {
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(this.startPos, this.endPos, eased);
    camera.lookAt(this.targetPos);
  }
}
