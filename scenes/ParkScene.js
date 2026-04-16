import * as THREE from 'three';
import { SceneBase } from './SceneBase.js';

export class ParkScene extends SceneBase {
  constructor() {
    super('ParkScene');
    this.tennisBall = null;
    this.net = null;
    this.racketDoraemon = null;
    this.racketNobita = null;
    this.ballTrajectory = null;
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

    // Tennis court props
    this.createNet();
    this.createBall();

    return this.scene;
  }

  createNet() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4 });
    const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const netGroup = new THREE.Group();
    netGroup.position.set(0, 0, 0);

    // Posts
    for (const x of [-3, 3]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), poleMat);
      pole.position.set(x, 0.6, 0);
      pole.castShadow = true;
      netGroup.add(pole);
    }

    // Net mesh
    const netMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.02), netMat);
    netMesh.position.set(0, 0.7, 0);
    netGroup.add(netMesh);

    // Net grid lines
    const gridMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    for (let i = -2; i <= 2; i++) {
      const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.8, 0.025), gridMat);
      vLine.position.set(i * 0.6, 0.7, 0);
      netGroup.add(vLine);
    }
    for (let j = -3; j <= 3; j++) {
      const hLine = new THREE.Mesh(new THREE.BoxGeometry(6, 0.01, 0.025), gridMat);
      hLine.position.set(0, 0.7 + j * 0.11, 0);
      netGroup.add(hLine);
    }

    this.scene.add(netGroup);
    this.net = netGroup;
  }

  createBall() {
    const ballGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xc8f902, roughness: 0.3 });
    this.tennisBall = new THREE.Mesh(ballGeo, ballMat);
    this.tennisBall.position.set(0, 0.08, 0);
    this.tennisBall.castShadow = true;
    this.scene.add(this.tennisBall);
  }

  createRacket(color = 0xff3333) {
    const racket = new THREE.Group();

    // Handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    handle.position.y = -0.2;
    racket.add(handle);

    // Frame
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.02, 8, 16),
      new THREE.MeshStandardMaterial({ color })
    );
    frame.position.y = 0.18;
    racket.add(frame);

    // Strings
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    const vStr = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.32, 0.005), stringMat);
    vStr.position.set(0, 0.18, 0);
    racket.add(vStr);
    const hStr = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.005), stringMat);
    hStr.position.set(0, 0.18, 0);
    racket.add(hStr);

    // Default orientation when held (face slightly forward for visibility)
    racket.rotation.set(Math.PI / 6, 0, Math.PI / 2);
    return racket;
  }

  attachRacketToCharacter(character, color = 0xff3333) {
    if (!character.rightArm || !character.rightArmLength) return null;
    const racket = this.createRacket(color);
    // Position at hand in local arm space
    racket.position.set(0, -character.rightArmLength, 0);
    character.rightArm.add(racket);
    return racket;
  }

  setBallTrajectory(startTime, endTime, startPos, endPos, arcHeight = 0.5) {
    this.ballTrajectory = { startTime, endTime, startPos, endPos, arcHeight };
  }

  clearBallTrajectory() {
    this.ballTrajectory = null;
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.ballTrajectory && this.tennisBall) {
      const { startTime, endTime, startPos, endPos, arcHeight } = this.ballTrajectory;
      if (time >= startTime && time <= endTime) {
        const progress = (time - startTime) / (endTime - startTime);
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        const x = startPos.x + (endPos.x - startPos.x) * t;
        const z = startPos.z + (endPos.z - startPos.z) * t;
        const y = startPos.y + (endPos.y - startPos.y) * t + Math.sin(progress * Math.PI) * arcHeight;
        this.tennisBall.position.set(x, y, z);
      }
    }
  }
}
