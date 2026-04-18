import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Static shot with optional explicit position and lookAt.
 * If no position is given, the camera stays where it is.
 */
export class Static extends CameraMoveBase {
  constructor(options = {}) {
    super(options);
    this.position = parseVecOption(options.position);
    this.lookAt = parseVecOption(options.lookAt);
  }

  start(camera, context) {
    super.start(camera, context);
    if (this.position) {
      camera.position.copy(this.position);
    }
    if (this.lookAt) {
      camera.lookAt(this.lookAt);
    }
  }

  update(t, camera, context) {
    // No-op: camera remains fixed
  }
}
