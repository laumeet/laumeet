import * as faceapi from "face-api.js";

class FaceEmojiProcessor {
  private modelsLoaded = false;
  private emojis = [
    "😅", "🥵", "😂", "🤣", "🙈", "😎", "🥳", "🤯", 
    "😇", "🤠", "😜", "🤪", "😏", "😤", "🤓", "🥺", "🤑", "🤫",
    "😱", "😴", "🤧", "🤕", "👽",  "🤖", "💀",
  ]; // 30 emojis

  async ensureModelsLoaded() {
    if (this.modelsLoaded) return;

    const MODEL_URL = "/models"; // ✅ from public/models
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`),
      faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`),
    ]);

    this.modelsLoaded = true;
  }

  isReady() {
    return this.modelsLoaded;
  }

  async maskFacesWithEmojis(file: File): Promise<Blob | null> {
    await this.ensureModelsLoaded();

    const img = await this.fileToImage(file);

    // Detect faces + landmarks
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detections.length) {
      console.log("⚠️ No faces detected in", file.name);
      return null;
    }

    // Prepare canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    detections.forEach((det) => {
      const landmarks = det.landmarks;

      // get bounding box of face landmarks (jaw, cheeks, forehead, etc.)
      const points = landmarks.positions;
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));

      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;

      // choose random emoji
      const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];

      // scale emoji to cover face (make a bit bigger than face size)
      const emojiSize = Math.max(faceWidth, faceHeight) * 1.4;

      // draw emoji at face center
      const centerX = minX + faceWidth / 2;
      const centerY = minY + faceHeight / 2;

      ctx.font = `${emojiSize}px serif`;
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
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}

let instance: FaceEmojiProcessor | null = null;
export const getFaceBlurProcessor = () => {
  if (!instance) instance = new FaceEmojiProcessor();
  return instance;
};
