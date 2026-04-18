import * as THREE from 'three';
import { CharacterBase } from './CharacterBase.js';

export class Shizuka extends CharacterBase {
  constructor() {
    super('Shizuka');
  }

  build() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.5 });
    const dressMat = new THREE.MeshStandardMaterial({ color: 0xff8da1, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.75;

    // Face
    const faceGeo = new THREE.SphereGeometry(0.32, 32, 32);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.scale.set(1, 1.1, 0.95);
    face.castShadow = true;
    headGroup.add(face);

    // Hair (rounded cap)
    const hairGeo = new THREE.SphereGeometry(0.34, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.05;
    headGroup.add(hair);

    // Pigtails (two braids)
    const braidGeo = new THREE.CapsuleGeometry(0.06, 0.35, 4, 8);
    const leftBraid = new THREE.Mesh(braidGeo, hairMat);
    leftBraid.position.set(-0.28, -0.15, -0.15);
    leftBraid.rotation.z = 0.35;
    leftBraid.rotation.x = 0.2;
    headGroup.add(leftBraid);

    const rightBraid = new THREE.Mesh(braidGeo, hairMat);
    rightBraid.position.set(0.28, -0.15, -0.15);
    rightBraid.rotation.z = -0.35;
    rightBraid.rotation.x = 0.2;
    headGroup.add(rightBraid);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.1, 0.04, 0.28);
    leftEye.scale.z = 0.4;
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.1, 0.04, 0.28);
    rightEye.scale.z = 0.4;
    headGroup.add(rightEye);

    const pupilGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const leftPupil = new THREE.Mesh(pupilGeo, blackMat);
    leftPupil.position.set(-0.1, 0.04, 0.3);
    leftPupil.userData.baseX = leftPupil.position.x;
    headGroup.add(leftPupil);
    this.leftPupil = leftPupil;

    const rightPupil = new THREE.Mesh(pupilGeo, blackMat);
    rightPupil.position.set(0.1, 0.04, 0.3);
    rightPupil.userData.baseX = rightPupil.position.x;
    headGroup.add(rightPupil);
    this.rightPupil = rightPupil;

    // Mouth (small smile)
    const mouthGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const mouth = new THREE.Mesh(mouthGeo, blackMat);
    mouth.position.set(0, -0.1, 0.28);
    mouth.scale.set(1.8, 0.35, 0.5);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.55;
    this.mesh.add(neck);

    // Dress (pink cone-like dress)
    const dressGeo = new THREE.ConeGeometry(0.32, 0.75, 32);
    const dress = new THREE.Mesh(dressGeo, dressMat);
    dress.position.y = 1.1;
    dress.castShadow = true;
    this.mesh.add(dress);

    // White collar
    const collarGeo = new THREE.TorusGeometry(0.14, 0.025, 8, 16);
    const collar = new THREE.Mesh(collarGeo, whiteMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.45;
    this.mesh.add(collar);

    // Arms + Hands
    const handGeo = new THREE.SphereGeometry(0.07, 16, 16);

    const addArm = (sx, sy, sz, hx, hy, hz, isRight) => {
      const group = new THREE.Group();
      group.position.set(sx, sy, sz);
      group.lookAt(hx, hy, hz);
      group.rotateX(-Math.PI / 2);

      const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
      const capLen = Math.max(0.01, len - 0.14);
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, capLen, 4, 16), skinMat);
      armMesh.position.y = -len / 2;
      group.add(armMesh);

      const handMesh = new THREE.Mesh(handGeo, skinMat);
      handMesh.position.y = -len;
      group.add(handMesh);

      this.mesh.add(group);
      if (isRight) {
        this.rightArm = group;
        this.rightArmLength = len;
        this.rightArmBaseZ = group.rotation.z;
      } else {
        this.leftArm = group;
        this.leftArmBaseZ = group.rotation.z;
      }
    };

    // Arms hang down
    addArm(-0.22, 1.38, 0, -0.35, 0.85, 0, false);
    addArm(0.22, 1.38, 0, 0.35, 0.85, 0, true);

    // Legs + Shoes
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 16);
    const shoeGeo = new THREE.SphereGeometry(0.1, 16, 16);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.12, 0.6, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, skinMat);
    leftLegMesh.position.y = -0.2;
    leftLegGroup.add(leftLegMesh);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.4, 0.04);
    leftShoe.scale.set(1, 0.6, 1.5);
    leftLegGroup.add(leftShoe);
    this.mesh.add(leftLegGroup);
    this.leftLeg = leftLegGroup;

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.12, 0.6, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, skinMat);
    rightLegMesh.position.y = -0.2;
    rightLegGroup.add(rightLegMesh);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.4, 0.04);
    rightShoe.scale.set(1, 0.6, 1.5);
    rightLegGroup.add(rightShoe);
    this.mesh.add(rightLegGroup);
    this.rightLeg = rightLegGroup;
  }
}
