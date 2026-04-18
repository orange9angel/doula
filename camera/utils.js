import * as THREE from 'three';

/**
 * Parse a vector option that may come as:
 * - Array: [x, y, z]
 * - Object: { x, y, z }
 * - THREE.Vector3
 * Returns a THREE.Vector3 or null.
 */
export function parseVecOption(v, defaultVec = null) {
  if (!v) return defaultVec;
  if (Array.isArray(v)) {
    return new THREE.Vector3(
      v[0] ?? defaultVec?.x ?? 0,
      v[1] ?? defaultVec?.y ?? 0,
      v[2] ?? defaultVec?.z ?? 0
    );
  }
  if (v instanceof THREE.Vector3) return v.clone();
  if (typeof v === 'object' && (v.x !== undefined || v.y !== undefined || v.z !== undefined)) {
    return new THREE.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0);
  }
  return defaultVec;
}
