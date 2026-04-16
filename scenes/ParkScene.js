import * as THREE from 'three';
import { SceneBase } from './SceneBase.js';

export class ParkScene extends SceneBase {
  constructor() {
    super('ParkScene');
  }

  build() {
    super.build();

    // Sky blue background
    this.scene.background = new THREE.Color(0x87ceeb);

    // Ground (grass)
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Bench
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });

    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.6), woodMat);
    benchSeat.position.set(0, 0.5, -2);
    benchSeat.castShadow = true;
    this.scene.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.1), woodMat);
    benchBack.position.set(0, 0.9, -2.25);
    benchBack.castShadow = true;
    this.scene.add(benchBack);

    for (const x of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), metalMat);
      leg.position.set(x, 0.25, -2);
      this.scene.add(leg);
    }

    // Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });

    const treePositions = [
      [-8, 0, -5],
      [10, 0, -8],
      [-12, 0, 4],
      [9, 0, 6],
      [-6, 0, -12],
    ];

    for (const [x, y, z] of treePositions) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.5, 12), trunkMat);
      trunk.position.set(x, y + 0.75, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), leavesMat);
      leaves.position.set(x, y + 2.5, z);
      leaves.castShadow = true;
      this.scene.add(leaves);
    }

    // Simple clouds (white spheres)
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 1.0 });
    const cloudPositions = [
      [-10, 12, -20],
      [5, 14, -25],
      [15, 11, -15],
    ];
    for (const [cx, cy, cz] of cloudPositions) {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(cx, cy, cz);
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random(), 16, 16), cloudMat);
        puff.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2);
        cloudGroup.add(puff);
      }
      this.scene.add(cloudGroup);
    }

    return this.scene;
  }
}
