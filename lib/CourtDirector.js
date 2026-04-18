import * as THREE from 'three';

/**
 * CourtDirector —— 场地-角色-球-相机-动作协调计算层。
 *
 * 职责：
 * 1. 持有场地几何信息（从 Scene 获取）
 * 2. 管理角色在场上的语义化位置
 * 3. 根据角色位置自动计算球飞行轨迹
 * 4. 根据"想要展示什么"自动计算相机机位
 * 5. 根据球轨迹自动计算挥拍提前量
 *
 * 设计原则：Scene 负责"画"，Director 负责"算"。
 */

const PLAYER_META = {
  Doraemon: {
    radius: 0.75,
    height: 1.8,
    armLength: 0.55,
    dominantHand: 'right',
    eyeHeight: 1.6,
    // Doraemon is rounder — keep a bit more spacing from lines
    margin: 0.3,
  },
  Nobita: {
    radius: 0.45,
    height: 1.6,
    armLength: 0.75,
    dominantHand: 'right',
    eyeHeight: 1.5,
    margin: 0.2,
  },
  Shizuka: {
    radius: 0.35,
    height: 1.45,
    armLength: 0.55,
    dominantHand: 'right',
    eyeHeight: 1.35,
    margin: 0.15,
  },
};

export class CourtDirector {
  constructor(courtGeometry) {
    this.geom = courtGeometry;
    this.playerPositions = new Map(); // role -> {x, y, z}
  }

  getCourtGeometry() {
    return this.geom;
  }

  getPlayerMeta(role) {
    return PLAYER_META[role] || { radius: 0.5, height: 1.6, armLength: 0.6, dominantHand: 'right', eyeHeight: 1.5, margin: 0.2 };
  }

  setPlayerPosition(role, pos) {
    this.playerPositions.set(role, { ...pos });
  }

  getPlayerPosition(role) {
    return this.playerPositions.get(role);
  }

  /**
   * 语义化站位。根据场地几何把角色放到标准位置。
   *
   * 改进点：
   * - 自动根据角色体型计算 margin，不会贴线
   * - 支持 face 参数，自动面向对手
   *
   * @param {string} role - 角色标识，如 'Doraemon'、'Nobita'
   * @param {string} spot - 站位语义：
   *   'northBaseline' | 'southBaseline' |
   *   'northService'  | 'southService'  |
   *   'center' | 'net'
   * @param {Object} options
   * @param {number} options.xOffset - -1 ~ 1，相对场半宽的偏移（0=居中）
   * @param {boolean} options.useDoubles - true 用双打宽度，false 用单打宽度
   * @param {number} options.y - 地面高度覆盖值
   * @param {string} options.face - 面向的角色名，或 'net' | 'camera' | 'north' | 'south'
   * @returns {{x, y, z}} 世界坐标
   */
  placePlayer(role, spot, options = {}) {
    const meta = this.getPlayerMeta(role);
    let z;
    switch (spot) {
      case 'northBaseline':
        z = -this.geom.baselineZ;
        break;
      case 'southBaseline':
        z = this.geom.baselineZ;
        break;
      case 'northService':
        z = -this.geom.serviceLineZ;
        break;
      case 'southService':
        z = this.geom.serviceLineZ;
        break;
      case 'center':
        z = 0;
        break;
      case 'net':
        z = this.geom.netZ;
        break;
      default:
        z = 0;
    }

    const halfWidth = options.useDoubles
      ? this.geom.doublesWidth / 2
      : this.geom.singlesWidth / 2;

    // Apply margin so the character's outer edge stays inside the line
    const effectiveHalfWidth = halfWidth - meta.radius - meta.margin;
    const x = (options.xOffset || 0) * Math.max(0, effectiveHalfWidth);
    const y = options.y !== undefined ? options.y : this.geom.groundY;

    const pos = { x, y, z };
    this.playerPositions.set(role, pos);

    // Orientation
    if (options.face) {
      this.orientPlayer(role, options.face);
    }

    return pos;
  }

  /**
   * 让角色面朝某个目标。
   * @param {string} role
   * @param {string|{x,y,z}} target - 角色名、'net'、'camera'（south+z）、'north'、'south'，或坐标对象
   * @returns {number} yaw rotation in radians
   */
  orientPlayer(role, target) {
    const pos = this.getPlayerPosition(role);
    if (!pos) return 0;

    let targetPos;
    if (typeof target === 'object' && target.x !== undefined) {
      targetPos = target;
    } else if (typeof target === 'string') {
      switch (target) {
        case 'net':
          targetPos = { x: 0, y: 1, z: 0 };
          break;
        case 'camera':
          targetPos = { x: pos.x, y: pos.y + 1, z: pos.z + 5 };
          break;
        case 'north':
          targetPos = { x: pos.x, y: pos.y + 1, z: pos.z - 5 };
          break;
        case 'south':
          targetPos = { x: pos.x, y: pos.y + 1, z: pos.z + 5 };
          break;
        default:
          // Assume another role name
          targetPos = this.getPlayerPosition(target);
          if (targetPos) {
            targetPos = { x: targetPos.x, y: targetPos.y + 1.5, z: targetPos.z };
          }
          break;
      }
    }

    if (!targetPos) return 0;

    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const yaw = Math.atan2(dx, dz);
    return yaw;
  }

  /**
   * 计算从 fromRole 飞向 toRole 的轨迹参数。
   *
   * @param {string} fromRole - 击球角色
   * @param {string} toRole - 目标角色（或落点角色）
   * @param {Object} options
   * @param {number} options.speed - 球速（units/sec，默认 8）
   * @param {number} options.arcHeight - 手动弧高（默认按距离自动）
   * @param {number} options.startHeight - 起始高度（默认 1.0）
   * @param {number} options.endHeight - 结束高度（默认 1.0）
   * @returns {Object|null} { startPos, endPos, arcHeight, duration, distance }
   */
  computeBallFlight(fromRole, toRole, options = {}) {
    const fromPos = this.getPlayerPosition(fromRole);
    const toPos = this.getPlayerPosition(toRole);
    if (!fromPos || !toPos) return null;

    const startPos = {
      x: fromPos.x,
      y: fromPos.y + (options.startHeight !== undefined ? options.startHeight : 1.0),
      z: fromPos.z,
    };
    const endPos = {
      x: toPos.x,
      y: toPos.y + (options.endHeight !== undefined ? options.endHeight : 1.0),
      z: toPos.z,
    };

    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const speed = options.speed || 8;
    const duration = distance / speed;

    let arcHeight;
    if (options.arcHeight !== undefined) {
      arcHeight = options.arcHeight;
    } else {
      // 自动弧高：距离越长弧越高，但封顶
      arcHeight = Math.min(distance * 0.15, 2.5);
    }

    return { startPos, endPos, arcHeight, duration, distance };
  }

  /**
   * 计算飞向固定世界坐标的球轨迹（用于失控球等特殊剧情）。
   *
   * @param {string} fromRole - 击球角色
   * @param {{x,y,z}} toPos - 目标世界坐标
   * @param {Object} options - 同 computeBallFlight
   */
  computeBallFlightToPos(fromRole, toPos, options = {}) {
    const fromPos = this.getPlayerPosition(fromRole);
    if (!fromPos) return null;

    const startPos = {
      x: fromPos.x,
      y: fromPos.y + (options.startHeight !== undefined ? options.startHeight : 1.0),
      z: fromPos.z,
    };
    const endPos = {
      x: toPos.x,
      y: toPos.y + (options.endHeight !== undefined ? options.endHeight : 1.0),
      z: toPos.z,
    };

    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const speed = options.speed || 8;
    const duration = distance / speed;

    let arcHeight;
    if (options.arcHeight !== undefined) {
      arcHeight = options.arcHeight;
    } else {
      arcHeight = Math.min(distance * 0.15, 2.5);
    }

    return { startPos, endPos, arcHeight, duration, distance };
  }

  /**
   * 根据视角类型自动计算相机位置和看向点。
   *
   * @param {string} viewType - 'rallySide' | 'rallyWide' | 'behindPlayer' | 'closeUp'
   * @param {string} focusRole - 焦点角色名
   * @param {Object} options
   * @param {number} options.distance - 相机距离覆盖
   * @param {number} options.height - 相机高度覆盖
   * @returns {{position: THREE.Vector3, lookAt: THREE.Vector3}|null}
   */
  computeCamera(viewType, focusRole, options = {}) {
    const focusPos = this.getPlayerPosition(focusRole);
    const center = new THREE.Vector3(0, 1, 0);

    switch (viewType) {
      case 'rallySide': {
        // 侧面，能看到两人和网。focusRole 在近侧。
        const side = focusPos && focusPos.z > 0 ? 1 : -1;
        const dist = options.distance || this.geom.width + 2;
        const height = options.height || 4;
        const pos = new THREE.Vector3(side * dist, height, 0);
        return { position: pos, lookAt: center };
      }

      case 'rallyWide': {
        // 广角俯瞰，展示全场两人对打
        const height = options.height || 12;
        const dist = options.distance || 16;
        const pos = new THREE.Vector3(0, height, dist);
        return { position: pos, lookAt: center };
      }

      case 'behindPlayer': {
        // 从 focusRole 身后看对面
        if (!focusPos) return null;
        const offsetZ = focusPos.z > 0 ? 3 : -3;
        const height = options.height || 3;
        const pos = new THREE.Vector3(focusPos.x, height, focusPos.z + offsetZ);
        return { position: pos, lookAt: center };
      }

      case 'closeUp': {
        // focusRole 特写
        if (!focusPos) return null;
        const dist = options.distance || 2.5;
        const height = options.height || 1.8;
        const pos = new THREE.Vector3(focusPos.x, focusPos.y + height, focusPos.z + dist);
        const lookAt = new THREE.Vector3(focusPos.x, focusPos.y + 1.2, focusPos.z);
        return { position: pos, lookAt };
      }

      default:
        return null;
    }
  }

  /**
   * 计算挥拍动画应该开始的时间。
   *
   * @param {Object} ballFlight - computeBallFlight 的返回值
   * @param {number} startTime - 球轨迹开始时间
   * @param {number} swingDuration - 挥拍动画时长（默认 0.6）
   * @returns {number} 挥拍开始时间
   */
  computeSwingTime(ballFlight, startTime, swingDuration = 0.6) {
    const ballArrival = startTime + ballFlight.duration;
    // 挥拍在球到达前 30% 开始，让击球点在动画中段附近
    const leadTime = swingDuration * 0.3;
    return ballArrival - leadTime;
  }
}
