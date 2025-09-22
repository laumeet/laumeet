import { getFaceBlurProcessor } from './faceBlur';

export const preloadFaceDetectionModels = () => {
  // This will trigger model loading when the app starts
  getFaceBlurProcessor();
};