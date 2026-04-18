import { AnimationBase } from '../AnimationBase.js';

export class PullOutRacket extends AnimationBase {
  constructor() {
    super('PullOutRacket', 1.5);
  }

  update(t, character) {
    const arm = character.rightArm;
    if (!arm) return;
    const baseZ = character.rightArmBaseZ || arm.rotation.z;

    // Gentle body sway while rummaging
    character.mesh.rotation.z = Math.sin(t * Math.PI * 3) * 0.06;

    if (t < 0.3) {
      // Phase 1: Reach down into pocket
      const p = t / 0.3;
      arm.rotation.z = baseZ + 0.5 * p;
      arm.rotation.x = -0.6 * p;
    } else if (t < 0.5) {
      // Phase 2: Dig around in pocket
      const p = (t - 0.3) / 0.2;
      arm.rotation.z = baseZ + 0.5 + Math.sin(p * Math.PI * 4) * 0.05;
      arm.rotation.x = -0.6 + Math.sin(p * Math.PI * 3) * 0.1;
    } else if (t < 0.7) {
      // Phase 3: Pull out and reveal racket
      const p = (t - 0.5) / 0.2;
      arm.rotation.z = baseZ + 0.5 * (1 - p);
      arm.rotation.x = -0.6 * (1 - p);
      if (character.pocketRacket && p > 0.3) {
        character.pocketRacket.visible = true;
      }
    } else {
      // Phase 4: Hold up racket
      const p = (t - 0.7) / 0.3;
      arm.rotation.z = baseZ + Math.sin(p * Math.PI) * 0.1;
      arm.rotation.x = Math.sin(p * Math.PI) * 0.15;
      if (character.pocketRacket) {
        character.pocketRacket.visible = true;
      }
    }
  }
}
