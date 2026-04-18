export { CameraMoveBase } from './CameraMoveBase.js';
export * from './common/index.js';

import { CommonCameraMoves } from './common/index.js';

export const CameraMoveRegistry = {
  ...CommonCameraMoves,
};
