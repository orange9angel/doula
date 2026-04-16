import * as THREE from 'three';

export class CharacterBase {
  constructor(name) {
    this.name = name;
    this.mesh = new THREE.Group();
    this.mesh.name = name;
    this.mouth = null;
    this.mouthBaseScaleX = 1;
    this.mouthBaseScaleY = 1;
    this.mouthBaseScaleZ = 1;
    this.headGroup = null;
    this.rightArm = null;
    this.baseY = 0;
    this.isSpeaking = false;
    this.speakStartTime = 0;
    this.speakEndTime = 0;
    this.animations = []; // queued animations
    this.moves = [];      // queued position moves
    this.teleportEvents = []; // instantaneous position resets
    this.build();
  }

  speak(startTime, duration) {
    this.isSpeaking = true;
    this.speakStartTime = startTime;
    this.speakEndTime = startTime + duration;
  }

  stopSpeaking() {
    this.isSpeaking = false;
    if (this.mouth) {
      this.mouth.scale.set(this.mouthBaseScaleX, this.mouthBaseScaleY, this.mouthBaseScaleZ);
    }
    if (this.headGroup) {
      this.headGroup.rotation.set(0, 0, 0);
    }
  }

  playAnimation(AnimClass, startTime, duration) {
    const anim = new AnimClass();
    this.animations.push({
      instance: anim,
      startTime,
      endTime: startTime + (duration !== undefined ? duration : anim.duration),
    });
  }

  moveTo(targetPos, startTime, duration) {
    this.moves.push({
      targetPos,
      startTime,
      endTime: startTime + duration,
    });
  }

  teleport(pos, time) {
    this.teleportEvents.push({ pos, time });
  }

  clearAnimations() {
    this.animations = [];
    this.moves = [];
    this.teleportEvents = [];
  }

  update(time, delta) {
    // Speaking
    if (this.isSpeaking) {
      if (time >= this.speakEndTime) {
        this.stopSpeaking();
      } else {
        this.animateMouth(time, delta);
        this.animateBody(time, delta);
      }
    }

    // Explicit animations
    for (const anim of this.animations) {
      if (time >= anim.startTime && time <= anim.endTime) {
        const progress = (time - anim.startTime) / (anim.endTime - anim.startTime);
        anim.instance.update(progress, this);
      }
    }

    // Position moves
    for (const move of this.moves) {
      if (time >= move.startTime && time < move.endTime) {
        if (move.startPos === undefined) {
          move.startPos = { x: this.mesh.position.x, z: this.mesh.position.z };
        }
        const progress = (time - move.startTime) / (move.endTime - move.startTime);
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; // easeInOutQuad
        const startX = move.startPos.x;
        const startZ = move.startPos.z;
        this.mesh.position.x = startX + (move.targetPos.x - startX) * t;
        this.mesh.position.z = startZ + (move.targetPos.z - startZ) * t;
        // face movement direction
        const dx = move.targetPos.x - this.mesh.position.x;
        const dz = move.targetPos.z - this.mesh.position.z;
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
          this.mesh.lookAt(this.mesh.position.x + dx, this.mesh.position.y, this.mesh.position.z + dz);
        }
      }
    }

    // Teleport events (applied after moves so they take precedence)
    for (const tp of this.teleportEvents) {
      if (time >= tp.time && time < tp.time + 0.05) {
        this.mesh.position.x = tp.pos.x;
        this.mesh.position.z = tp.pos.z;
      }
    }
  }

  animateMouth(time, delta) {
    if (!this.mouth) return;
    // Pronounced mouth opening for clear visibility
    const speed = 10;
    const factor = Math.abs(Math.sin(time * speed));
    const openness = this.mouthBaseScaleY * (0.2 + 2.5 * factor);
    this.mouth.scale.y = openness;
    // Slight expansion in x/z to look like a real opening mouth
    this.mouth.scale.x = this.mouthBaseScaleX * (1.0 + 0.3 * factor);
    this.mouth.scale.z = this.mouthBaseScaleZ * (1.0 + 0.3 * factor);
  }

  animateBody(time, delta) {
    if (!this.headGroup) return;
    // Gentle nodding and slight sway while speaking
    this.headGroup.rotation.x = Math.sin(time * 10) * 0.05;
    this.headGroup.rotation.y = Math.sin(time * 5) * 0.03;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.baseY = y;
  }

  lookAt(target) {
    this.mesh.lookAt(target);
  }
}
