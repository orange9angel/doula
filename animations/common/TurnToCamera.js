import { AnimationBase } from '../AnimationBase.js';

export class TurnToCamera extends AnimationBase {
  constructor() {
    super('TurnToCamera', 0.3);
    this.startRotationY = null;
  }

  update(t, character) {
    if (this.startRotationY === null) {
      this.startRotationY = character.mesh.rotation.y;
    }
    const targetY = 0; // face positive Z (camera)
    let diff = targetY - this.startRotationY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    character.mesh.rotation.y = this.startRotationY + diff * t;
  }
}
