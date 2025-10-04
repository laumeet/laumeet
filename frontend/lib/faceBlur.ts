// lib/faceBlur.ts
import * as faceapi from "face-api.js";

class FaceEmojiProcessor {
  private modelsLoaded = false;
  private modelsLoading = false;
  
  private emojis = [
    "😅", "🥵", "😂", "🤣", "🙈", "😎", "🥳", "🤯",
    "😇", "🤠", "😜", "🤪", "😏", "😤", "🤓", "🥺", "🤑", "🤫",
    "😱", "😴", "🤧", "🤕", "👽", "🤖", "💀",
  ];

  async ensureModelsLoaded() {
    // If models are already loaded, return immediately
    if (this.modelsLoaded) return;
    
    // If models are currently loading, wait for them to finish
    if (this.modelsLoading) {
      await this.waitForModels();
      return;
    }

    this.modelsLoading = true;

    try {
      const MODEL_URL = "/models";
      
      console.log('Loading TinyYolov2 face detection model...');
      
      // Load TinyYolov2 model specifically for face detection
      await faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`);
      console.log('TinyYolov2 model loaded successfully');
      
      // Load face landmarks model (optional, but useful for better face coverage)
      await faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`);
      console.log('Face landmark model loaded successfully');

      this.modelsLoaded = true;
      this.modelsLoading = false;
      
      // Store in localStorage that models are loaded
      localStorage.setItem('faceDetectionModelsLoaded', 'true');
      console.log('All face detection models loaded and cached');

    } catch (error) {
      this.modelsLoading = false;
      console.error('Failed to load face detection models:', error);
      throw error;
    }
  }

  private async waitForModels(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.modelsLoaded || !this.modelsLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  isReady() {
    return this.modelsLoaded;
  }

  async maskFacesWithEmojis(file: File): Promise<Blob | null> {
    // Ensure models are loaded before inference
    await this.ensureModelsLoaded();
    
    console.log('Starting face detection with TinyYolov2...');
    
    const img = await this.fileToImage(file);
    
    // Detect faces using TinyYolov2
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416, // 416x416 is commonly used with TinyYolov2
      scoreThreshold: 0.5 // Confidence threshold
    });

    console.log('Running face detection...');
    const detections = await faceapi
      .detectAllFaces(img, detectionOptions)
      .withFaceLandmarks();

    console.log(`Detected ${detections.length} faces`);

    if (!detections.length) {
      console.log("⚠️ No faces detected in", file.name);
      return null;
    }

    // Prepare canvas for emoji overlay
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    
    // Draw original image first
    ctx.drawImage(img, 0, 0);

    // Overlay emojis on detected faces
    detections.forEach((det, index) => {
      const landmarks = det.landmarks;
      
      // Get bounding box from detection (more accurate than landmarks)
      const box = det.detection.box;
      const faceWidth = box.width;
      const faceHeight = box.height;

      // Choose random emoji
      const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
      
      // Scale emoji to cover face (make a bit bigger than face size)
      const emojiSize = Math.max(faceWidth, faceHeight) * 1.4;
      
      // Position emoji at face center
      const centerX = box.x + faceWidth / 2;
      const centerY = box.y + faceHeight / 2;
      
      // Set font and draw emoji
      ctx.font = `${emojiSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, centerX, centerY);

      console.log(`Face ${index + 1}: Covered with ${emoji} at (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        console.log('Emoji overlay completed, blob created');
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  }

  // Alternative method using just bounding boxes (faster)
  async maskFacesWithEmojisFast(file: File): Promise<Blob | null> {
    await this.ensureModelsLoaded();
    
    const img = await this.fileToImage(file);
    
    // Only detect faces without landmarks (faster)
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    });

    const detections = await faceapi.detectAllFaces(img, detectionOptions);

    if (!detections.length) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    detections.forEach((det) => {
      const box = det.box;
      const faceWidth = box.width;
      const faceHeight = box.height;
      const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
      const emojiSize = Math.max(faceWidth, faceHeight) * 1.4;
      const centerX = box.x + faceWidth / 2;
      const centerY = box.y + faceHeight / 2;
      
      ctx.font = `${emojiSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, centerX, centerY);
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }

  private fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Image loaded: ${img.width}x${img.height}`);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Method to get model loading status
  getModelStatus() {
    return {
      loaded: this.modelsLoaded,
      loading: this.modelsLoading
    };
  }
}

let instance: FaceEmojiProcessor | null = null;

export const getFaceBlurProcessor = () => {
  if (!instance) instance = new FaceEmojiProcessor();
  return instance;
};

export const preloadFaceDetectionModels = async (): Promise<boolean> => {
  try {
    const processor = getFaceBlurProcessor();
    
    // Check if models are already cached
    const modelsLoaded = localStorage.getItem('faceDetectionModelsLoaded');
    if (modelsLoaded === 'true') {
      console.log('Face detection models already loaded from cache');
      return true;
    }

    console.log('Preloading TinyYolov2 face detection models...');
    
    // Set a loading state to prevent multiple simultaneous loads
    localStorage.setItem('faceDetectionModelsLoading', 'true');
    
    await processor.ensureModelsLoaded();
    
    // Clear loading state and set loaded state
    localStorage.removeItem('faceDetectionModelsLoading');
    localStorage.setItem('faceDetectionModelsLoaded', 'true');
    
    console.log('TinyYolov2 face detection models preloaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to preload face detection models:', error);
    
    // Clear loading state on error
    localStorage.removeItem('faceDetectionModelsLoading');
    localStorage.setItem('faceDetectionModelsError', 'true');
    
    return false;
  }
};

// Helper function to check preload status
export const getPreloadStatus = () => {
  return {
    loaded: localStorage.getItem('faceDetectionModelsLoaded') === 'true',
    loading: localStorage.getItem('faceDetectionModelsLoading') === 'true',
    error: localStorage.getItem('faceDetectionModelsError') === 'true',
  };
};

// Function to clear model cache (useful for development)
export const clearModelCache = () => {
  localStorage.removeItem('faceDetectionModelsLoaded');
  localStorage.removeItem('faceDetectionModelsLoading');
  localStorage.removeItem('faceDetectionModelsError');
  if (instance) {
    // Reset the instance to force reload on next use
    instance = null;
  }
  console.log('Face detection model cache cleared');
};