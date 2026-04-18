import { AnimationBase } from '../AnimationBase.js';

/**
 * Realistic tennis racket swing animation.
 * Phases:
 *   0-15%  Ready / unit turn (shoulder rotation, racket take-back)
 *   15-35% Backswing (full coiling, racket drop)
 *   35-55% Forward swing / contact (explosive uncoil, snap)
 *   55-100% Follow-through (deceleration, balance recovery)
 *
 * Duration is tuned to ~0.8s so it feels athletic but readable.
 */
export class SwingRacket extends AnimationBase {
  constructor() {
    super('SwingRacket', 0.8);
  }

  update(t, character) {
    const arm = character.rightArm;
    if (!arm) return;

    // Snapshot base rotations on first frame
    if (this._baseArmZ === undefined) {
      this._baseArmZ = character.rightArmBaseZ !== undefined ? character.rightArmBaseZ : arm.rotation.z;
      this._baseArmX = arm.rotation.x;
      this._baseBodyY = character.mesh.rotation.y;
      this._baseLeftArmZ = character.leftArm
        ? (character.leftArmBaseZ !== undefined ? character.leftArmBaseZ : character.leftArm.rotation.z)
        : 0;
      this._baseLeftArmX = character.leftArm ? character.leftArm.rotation.x : 0;
      this._baseY = character.baseY || 0;
    }

    const body = character.mesh;
    const leftArm = character.leftArm;

    if (t < 0.15) {
      // READY: slight unit turn, racket starts back
      const p = t / 0.15;
      const ease = p * p; // ease in
      body.rotation.y = this._baseBodyY + 0.35 * ease;
      arm.rotation.z = this._baseArmZ + 0.25 * ease;
      arm.rotation.x = this._baseArmX - 0.1 * ease;
      if (leftArm) {
        leftArm.rotation.z = this._baseLeftArmZ - 0.15 * ease;
        leftArm.rotation.x = this._baseLeftArmX + 0.05 * ease;
      }
      // Slight knee flex (athletic stance)
      body.position.y = this._baseY - 0.04 * ease;
    } else if (t < 0.35) {
      // BACKSWING: full coil, racket way back and dropped
      const p = (t - 0.15) / 0.2;
      const ease = p * (2 - p); // ease out
      body.rotation.y = this._baseBodyY + 0.35 + 0.45 * ease;
      arm.rotation.z = this._baseArmZ + 0.25 + 0.7 * ease; // racket back
      arm.rotation.x = this._baseArmX - 0.1 - 0.35 * ease; // racket drop (pat-the-dog)
      if (leftArm) {
        leftArm.rotation.z = this._baseLeftArmZ - 0.15 - 0.25 * ease; // left arm extends for balance
        leftArm.rotation.x = this._baseLeftArmX + 0.05 + 0.1 * ease;
      }
      body.position.y = this._baseY - 0.04 - 0.03 * ease; // lower center of gravity
    } else if (t < 0.55) {
      // FORWARD SWING / CONTACT: explosive uncoil
      const p = (t - 0.35) / 0.2;
      // Use a sharp ease-in for snap
      const snap = p * p;
      body.rotation.y = this._baseBodyY + 0.8 - 1.0 * snap; // rotate through the ball
      arm.rotation.z = this._baseArmZ + 0.95 - 1.5 * snap; // snap forward
      arm.rotation.x = this._baseArmX - 0.45 + 0.55 * snap; // racket comes up through contact
      if (leftArm) {
        leftArm.rotation.z = this._baseLeftArmZ - 0.4 + 0.3 * snap;
        leftArm.rotation.x = this._baseLeftArmX + 0.15 - 0.1 * snap;
      }
      // Contact pop: slight upward body on impact (peak at p ~ 0.5)
      const pop = Math.sin(p * Math.PI);
      body.position.y = this._baseY - 0.07 + 0.1 * pop;
    } else {
      // FOLLOW-THROUGH: decelerate, recover balance
      const p = (t - 0.55) / 0.45;
      const ease = p * p; // quadratic ease in
      body.rotation.y = this._baseBodyY - 0.2 + 0.2 * ease;
      arm.rotation.z = this._baseArmZ - 0.55 + 0.55 * ease;
      arm.rotation.x = this._baseArmX + 0.1 - 0.1 * ease;
      if (leftArm) {
        leftArm.rotation.z = this._baseLeftArmZ - 0.1 + 0.1 * ease;
        leftArm.rotation.x = this._baseLeftArmX + 0.05 - 0.05 * ease;
      }
      body.position.y = this._baseY + 0.03 - 0.03 * ease;
    }
  }
}
