// components/providers/ModelPreloader.tsx
'use client';

import { useEffect } from 'react';
import { preloadFaceDetectionModels } from '@/lib/faceBlur';

export default function ModelPreloader() {
  useEffect(() => {
    // Preload face detection models when component mounts
    preloadFaceDetectionModels();
  }, []);

  return null; // This component doesn't render anything
}