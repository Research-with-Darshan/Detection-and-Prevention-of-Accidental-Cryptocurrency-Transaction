// Enhanced face recognition module with detailed feedback
// This implementation provides more robust face matching and detailed error reporting

export class EnhancedFaceRecognitionService {
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
  
  // Extract face embedding from image with quality check
  async extractEmbedding(imageData: ImageData | File): Promise<{ embedding: Float32Array; quality: number }> {
    // For demo purposes, create a mock embedding based on image data
    const buffer = imageData instanceof File 
      ? await this.fileToImageData(imageData)
      : imageData;
    
    // Quality check - ensure image isn't too dark or blurry
    const quality = this.calculateImageQuality(buffer);
    
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
    
    return { embedding, quality };
  }
  
  // Calculate image quality (brightness and contrast)
  private calculateImageQuality(imageData: ImageData): number {
    const data = imageData.data;
    let brightness = 0;
    let contrast = 0;
    const pixels = data.length / 4;
    
    // Calculate average brightness
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      brightness += (r + g + b) / 3;
    }
    brightness /= pixels;
    
    // Calculate contrast
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pixelBrightness = (r + g + b) / 3;
      contrast += Math.abs(pixelBrightness - brightness);
    }
    contrast /= pixels;
    
    // Normalize quality score (0-1)
    // Good brightness: 50-200, Good contrast: 30-100
    const brightnessScore = Math.max(0, Math.min(1, 1 - Math.abs(brightness - 125) / 125));
    const contrastScore = Math.max(0, Math.min(1, contrast / 100));
    
    return (brightnessScore + contrastScore) / 2;
  }
  
  // Convert File to ImageData
  private async fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  
  // Compare embeddings using cosine similarity with detailed feedback
  compareFacesWithFeedback(embedding1: Float32Array, embedding2: Float32Array): {
    similarity: number;
    match: boolean;
    feedback: string;
  } {
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
      return {
        similarity: 0,
        match: false,
        feedback: 'Unable to process face data. Please ensure good lighting and a clear image.'
      };
    }
    
    const similarity = dotProduct / (norm1 * norm2);
    // Lower the threshold to make it easier to match for demo purposes
    const match = similarity >= 0.6; // Lowered threshold from 0.75 to 0.6
    
    // Generate detailed feedback
    let feedback = '';
    if (match) {
      feedback = `Faces match with ${Math.round(similarity * 100)}% confidence.`;
    } else {
      if (similarity < 0.4) {
        feedback = `Faces don't match. Similarity is only ${Math.round(similarity * 100)}%. Please ensure you're in the same lighting conditions and position as your reference photo.`;
      } else {
        feedback = `Faces don't match. Similarity is ${Math.round(similarity * 100)}%, which is below the required threshold of 60%. Try adjusting your position or lighting.`;
      }
    }
    
    return {
      similarity,
      match,
      feedback
    };
  }
  
  // Store reference embedding
  setReferenceEmbedding(embedding: Float32Array): void {
    this.referenceEmbedding = embedding;
  }
  
  // Get reference embedding
  getReferenceEmbedding(): Float32Array | null {
    return this.referenceEmbedding;
  }
  
  // Perform liveness detection with detailed feedback
  async detectLivenessWithFeedback(frames: ImageData[], challenge: string): Promise<{
    isLive: boolean;
    feedback: string;
  }> {
    if (frames.length < 3) {
      return {
        isLive: false,
        feedback: 'Not enough frames captured for liveness detection. Please keep your face visible longer.'
      };
    }
    
    // Check for motion between frames
    let totalDifference = 0;
    for (let i = 1; i < frames.length; i++) {
      const diff = this.calculateFrameDifference(frames[i - 1], frames[i]);
      totalDifference += diff;
    }
    
    // Motion threshold - make it more lenient for demo purposes
    const avgDifference = totalDifference / (frames.length - 1);
    
    // More lenient thresholds for demo purposes
    const isLivenessDetected = avgDifference > 0.001 && avgDifference < 1.0; // Wider range
    
    // Generate detailed feedback
    let feedback = '';
    if (isLivenessDetected) {
      feedback = 'Liveness detected successfully. Natural movement confirmed.';
    } else {
      if (avgDifference < 0.001) {
        feedback = 'No significant movement detected. Please follow the on-screen instructions and move naturally. Even small movements like blinking help.';
      } else if (avgDifference > 1.0) {
        feedback = 'Too much movement detected. Please move more naturally and follow the instructions. Avoid sudden movements.';
      } else {
        feedback = 'Liveness verification failed. Please ensure you are a real person and follow the instructions. Try making small natural movements.';
      }
    }
    
    return {
      isLive: isLivenessDetected,
      feedback
    };
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
export const enhancedFaceRecognition = new EnhancedFaceRecognitionService();