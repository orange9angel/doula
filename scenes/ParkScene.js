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

    // ---- Ground (grass) ----
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ---- Tennis Court ----
    const courtColor = new THREE.MeshStandardMaterial({ color: 0x3d6b8f, roughness: 0.7 });
    const lineColor = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    // Main court surface (12 x 24 units, centered at origin)
    const courtGeo = new THREE.PlaneGeometry(12, 24);
    const court = new THREE.Mesh(courtGeo, courtColor);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, 0); // slightly above grass
    court.receiveShadow = true;
    this.scene.add(court);

    // Outer boundary line
    const border = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 24.4), lineColor);
    border.rotation.x = -Math.PI / 2;
    border.position.set(0, 0.005, 0);
    this.scene.add(border);
    // Inner court (so lines appear as white borders)
    const courtInner = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 23.6), courtColor);
    courtInner.rotation.x = -Math.PI / 2;
    courtInner.position.set(0, 0.008, 0);
    this.scene.add(courtInner);

    // Center line (along X, at Z=0)
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 12), lineColor);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, 0.015, 0);
    this.scene.add(centerLine);

    // Service lines (two horizontal lines at Z = +/-6)
    for (const z of [-6, 6]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.08), lineColor);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.015, z);
      this.scene.add(line);
    }

    // Sidelines (two vertical lines at X = +/-4)
    for (const x of [-4, 4]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 24), lineColor);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.015, 0);
      this.scene.add(line);
    }

    // Singles sidelines (two vertical lines at X = +/-3)
    for (const x of [-3, 3]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 24), lineColor);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.015, 0);
      this.scene.add(line);
    }

    // ---- Tennis Net (in the middle, along X axis) ----
    this.createNet();

    // ---- Tennis Ball ----
    this.createBall();

    // ---- Benches (off to the side, facing the court) ----
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });

    // Bench on the left side of the court, facing center
    this.createBench(woodMat, metalMat, -9, 0, 0, Math.PI / 2);
    // Bench on the right side of the court, facing center
    this.createBench(woodMat, metalMat, 9, 0, 0, -Math.PI / 2);

    // ---- Trees (in the background, away from court) ----
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });

    const treePositions = [
      [-15, 0, -10],
      [15, 0, -10],
      [-18, 0, 8],
      [18, 0, 8],
      [-12, 0, -18],
      [12, 0, -18],
      [-20, 0, -3],
      [20, 0, -3],
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

    // ---- Simple clouds ----
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 1.0 });
    const cloudPositions = [
      [-10, 12, -20],
      [5, 14, -25],
      [15, 11, -15],
      [-8, 13, -18],
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

  createBench(woodMat, metalMat, x, y, z, rotationY = 0) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, y, z);
    benchGroup.rotation.y = rotationY;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.6), woodMat);
    seat.position.set(0, 0.5, 0);
    seat.castShadow = true;
    benchGroup.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.1), woodMat);
    back.position.set(0, 0.9, -0.25);
    back.castShadow = true;
    benchGroup.add(back);

    for (const bx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), metalMat);
      leg.position.set(bx, 0.25, 0);
      benchGroup.add(leg);
    }

    this.scene.add(benchGroup);
  }

  createNet() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4 });
    const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const netGroup = new THREE.Group();
    netGroup.position.set(0, 0, 0);

    // Posts (at the singles sidelines)
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

  getCourtGeometry() {
    return {
      width: 12,
      length: 24,
      netZ: 0,
      baselineZ: 11,
      serviceLineZ: 6,
      singlesWidth: 6,
      doublesWidth: 8,
      groundY: 0.01,
    };
  }

  attachRacketToCharacter(character, color = 0xff3333) {
    if (!character.rightArm || !character.rightArmLength) return null;
    const racket = this.createRacket(color);
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
