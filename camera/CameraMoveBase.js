/**
 * Camera movement base class.
 * Similar to AnimationBase, but operates on the camera instead of a character.
 */
export class CameraMoveBase {
  constructor(options = {}) {
    this.name = this.constructor.name;
    this.duration = options.duration ?? 1.0;
    this.started = false;
    this.ended = false;
  }

  /**
   * Called once when the camera move begins.
   * Override to snapshot the camera's initial state.
   *
   * @param {THREE.Camera} camera
   * @param {Object} context - { renderer, scene, characters, currentScene }
   */
  start(camera, context) {
    this.started = true;
  }

  /**
   * Called every frame while the move is active.
   *
   * @param {number} t - progress from 0 to 1
   * @param {THREE.Camera} camera
   * @param {Object} context
   */
  update(t, camera, context) {
    // override in subclass
  }

  /**
   * Called once when the move ends (time > endTime).
   * Use this to snap the camera to a clean final state if needed.
   *
   * @param {THREE.Camera} camera
   * @param {Object} context
   */
  end(camera, context) {
    this.ended = true;
  }
}
