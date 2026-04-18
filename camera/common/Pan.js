import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Pan / truck: move the camera sideways while keeping lookAt fixed.
 */
export class Pan extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 2.0 });
    this.offset = parseVecOption(options.offset, new THREE.Vector3(2, 0, 0));
    this.lookAt = parseVecOption(options.lookAt, new THREE.Vector3(0, 1.5, 0));
  }

  start(camera, context) {
    super.start(camera, context);
    this.startPos = camera.position.clone();
    this.endPos = this.startPos.clone().add(this.offset);
  }

  update(t, camera, context) {
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(this.startPos, this.endPos, eased);
    camera.lookAt(this.lookAt);
  }
}
