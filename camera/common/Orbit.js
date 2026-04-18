import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Orbit around a target point.
 */
export class Orbit extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 3.0 });
    this.center = parseVecOption(options.center, new THREE.Vector3(0, 1.5, 0));
    this.radius = options.radius ?? 8;
    this.startAngle = options.startAngle ?? 0;
    this.endAngle = options.endAngle ?? Math.PI / 2;
    this.height = options.height ?? 3;
  }

  start(camera, context) {
    super.start(camera, context);
  }

  update(t, camera, context) {
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const angle = this.startAngle + (this.endAngle - this.startAngle) * eased;
    camera.position.set(
      this.center.x + Math.cos(angle) * this.radius,
      this.center.y + this.height,
      this.center.z + Math.sin(angle) * this.radius
    );
    camera.lookAt(this.center);
  }
}
