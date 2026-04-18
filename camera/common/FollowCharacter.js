import * as THREE from 'three';
import { CameraMoveBase } from '../CameraMoveBase.js';
import { parseVecOption } from '../utils.js';

/**
 * Follow a character from a fixed offset.
 */
export class FollowCharacter extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 1.0 });
    this.characterName = options.characterName ?? 'Nobita';
    this.offset = parseVecOption(options.offset, new THREE.Vector3(0, 3, 6));
    this.lookAtOffset = parseVecOption(options.lookAtOffset, new THREE.Vector3(0, 1.5, 0));
  }

  update(t, camera, context) {
    const char = context.characters.get(this.characterName);
    if (!char) return;
    const pos = char.mesh.position;
    camera.position.set(
      pos.x + this.offset.x,
      pos.y + this.offset.y,
      pos.z + this.offset.z
    );
    camera.lookAt(
      pos.x + this.lookAtOffset.x,
      pos.y + this.lookAtOffset.y,
      pos.z + this.lookAtOffset.z
    );
  }
}
