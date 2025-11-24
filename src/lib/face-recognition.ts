// Simplified face recognition module using Web APIs
// In production, you would use face-api.js or @huggingface/transformers

export class FaceRecognitionService {
  private referenceEmbedding: Float32Array | null = null;
  private stream: MediaStream | null = null;
  
  // Initialize face detection
  async initialize(): Promise<void> {
    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported in this browser');
    }
  }
  
  // Start camera stream
  async startCamera(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      return this.stream;
    } catch (error: any) {
      console.error('Camera error:', error);
      throw new Error(`Failed to access camera: ${error.message || 'Unknown error'}`);
    }
  }
  
  // Stop camera stream
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
  
  // Extract face embedding from image
  async extractEmbedding(imageData: ImageData | File): Promise<Float32Array> {
    // Simplified embedding extraction
    // In production, use face-api.js or ONNX models
    
    // For demo purposes, create a mock embedding based on image data
    const buffer = imageData instanceof File 
      ? await this.fileToImageData(imageData)
      : imageData;
    
    // Create a simplified hash-like embedding
    const embedding = new Float32Array(128);
    const data = buffer.data;
    
    for (let i = 0; i < 128; i++) {
      let sum = 0;
      const chunk = Math.floor(data.length / 128);
      for (let j = i * chunk; j < (i + 1) * chunk && j < data.length; j += 4) {
        sum += data[j] + data[j + 1] + data[j + 2];
      }
      embedding[i] = sum / chunk / 765; // Normalize to 0-1
    }
    
    return embedding;
  }
  
  // Convert File to ImageData
  private async fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          resolve(imageData);
        } else {
          reject(new Error('Failed to extract image data'));
        }
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  
  // Compare embeddings using cosine similarity
  compareFaces(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }
  
  // Store reference embedding
  setReferenceEmbedding(embedding: Float32Array): void {
    this.referenceEmbedding = embedding;
  }
  
  // Get reference embedding
  getReferenceEmbedding(): Float32Array | null {
    return this.referenceEmbedding;
  }
  
  // Perform liveness detection
  async detectLiveness(frames: ImageData[], challenge: string): Promise<boolean> {
    // Simplified liveness detection
    // In production, use proper facial landmark detection
    
    if (frames.length < 3) {
      console.log('Not enough frames for liveness detection');
      return false;
    }
    
    // Check for motion between frames
    let totalDifference = 0;
    for (let i = 1; i < frames.length; i++) {
      const diff = this.calculateFrameDifference(frames[i - 1], frames[i]);
      totalDifference += diff;
    }
    
    // Motion threshold (simplified)
    const avgDifference = totalDifference / (frames.length - 1);
    console.log('Liveness detection - Average frame difference:', avgDifference);
    
    // More lenient thresholds for demo purposes
    const isLivenessDetected = avgDifference > 0.005 && avgDifference < 0.8;
    console.log('Liveness detected:', isLivenessDetected);
    
    return isLivenessDetected;
  }
  
  // Calculate difference between frames
  private calculateFrameDifference(frame1: ImageData, frame2: ImageData): number {
    let diff = 0;
    const pixels = frame1.data.length / 4;
    
    for (let i = 0; i < frame1.data.length; i += 4) {
      const r1 = frame1.data[i];
      const g1 = frame1.data[i + 1];
      const b1 = frame1.data[i + 2];
      
      const r2 = frame2.data[i];
      const g2 = frame2.data[i + 1];
      const b2 = frame2.data[i + 2];
      
      diff += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    }
    
    return diff / (pixels * 765); // Normalize
  }
  
  // Capture frame from video stream
  captureFrame(video: HTMLVideoElement): ImageData | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

// Singleton instance
export const faceRecognition = new FaceRecognitionService();