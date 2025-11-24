import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SecureButton } from '@/components/ui/secure-button';
import { CFR_CONFIG } from '@/lib/constants';
import { enhancedFaceRecognition } from '@/lib/enhanced-face-recognition';
import { AlertCircle, Camera, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface FaceRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (embedding: Float32Array) => void;
  referenceEmbedding?: Float32Array;
  mode: 'register' | 'verify';
}

export function FaceRecognitionModal({
  isOpen,
  onClose,
  onSuccess,
  referenceEmbedding,
  mode,
}: FaceRecognitionModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState('');
  const [progress, setProgress] = useState(0);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [livenessDetected, setLivenessDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedFrames = useRef<ImageData[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const startCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      setProgress(0);
      setSimilarity(null);
      setLivenessDetected(false);
      setErrorMessage(null);
      setFeedbackMessage(null);
      capturedFrames.current = [];
      
      // Select random challenge for liveness
      const challenge = CFR_CONFIG.LIVENESS_CHALLENGES[
        Math.floor(Math.random() * CFR_CONFIG.LIVENESS_CHALLENGES.length)
      ];
      setCurrentChallenge(challenge);
      
      // Start camera
      const stream = await enhancedFaceRecognition.startCamera();
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Start capture timer
      const startTime = Date.now();
      const captureInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const progressPercent = (elapsed / CFR_CONFIG.MAX_CAPTURE_TIME) * 100;
        setProgress(Math.min(progressPercent, 100));
        
        // Capture frame
        if (videoRef.current) {
          const frame = enhancedFaceRecognition.captureFrame(videoRef.current);
          if (frame) {
            capturedFrames.current.push(frame);
            
            // Check if we have enough frames for verification
            if (capturedFrames.current.length >= 3) { // Reduced from 5 to 3 for faster feedback
              try {
                // Extract embedding from latest frame
                const { embedding, quality } = await enhancedFaceRecognition.extractEmbedding(frame);
                
                // Check image quality
                if (quality < 0.2) {
                  const message = 'Poor image quality detected. Please ensure good lighting and a clear view of your face. Move closer to the camera if needed.';
                  setFeedbackMessage(message);
                  console.log('Poor image quality:', quality);
                }
                
                if (mode === 'verify' && referenceEmbedding) {
                  // Compare with reference
                  const comparisonResult = enhancedFaceRecognition.compareFacesWithFeedback(embedding, referenceEmbedding);
                  setSimilarity(comparisonResult.similarity);
                  
                  // Check liveness
                  const livenessResult = await enhancedFaceRecognition.detectLivenessWithFeedback(
                    capturedFrames.current.slice(-3),
                    challenge
                  );
                  setLivenessDetected(livenessResult.isLive);
                  
                  // Show detailed feedback
                  console.log('Face verification details:', {
                    similarity: comparisonResult.similarity,
                    match: comparisonResult.match,
                    liveness: livenessResult.isLive,
                    quality: quality
                  });
                  
                  // Set feedback messages
                  if (!comparisonResult.match) {
                    setFeedbackMessage(comparisonResult.feedback);
                  } else if (!livenessResult.isLive) {
                    setFeedbackMessage(livenessResult.feedback);
                  }
                  
                  // Success if both similarity and liveness pass
                  if (comparisonResult.match && livenessResult.isLive) {
                    clearInterval(captureInterval);
                    handleSuccess(embedding);
                  }
                } else if (mode === 'register') {
                  // For registration, just check liveness and quality
                  const livenessResult = await enhancedFaceRecognition.detectLivenessWithFeedback(
                    capturedFrames.current.slice(-3),
                    challenge
                  );
                  setLivenessDetected(livenessResult.isLive);
                  
                  // Show feedback
                  if (livenessResult.isLive && quality >= 0.2) {
                    clearInterval(captureInterval);
                    handleSuccess(embedding);
                  } else if (!livenessResult.isLive) {
                    setFeedbackMessage(livenessResult.feedback);
                  } else if (quality < 0.2) {
                    const message = 'Poor image quality detected. Please ensure good lighting and a clear view of your face. Move closer to the camera if needed.';
                    setFeedbackMessage(message);
                  }
                }
              } catch (error: any) {
                console.error('Face processing error:', error);
                const message = `Face processing failed: ${error.message || 'Unknown error'}. Please try again.`;
                setErrorMessage(message);
              }
            }
          }
        }
        
        // Timeout
        if (elapsed >= CFR_CONFIG.MAX_CAPTURE_TIME) {
          clearInterval(captureInterval);
          handleTimeout();
        }
      }, 300); // Reduced interval from 500 to 300 for faster feedback
      
      timeoutRef.current = captureInterval as any;
    } catch (error: any) {
      console.error('Camera error:', error);
      const message = error.message || 'Failed to start camera. Please ensure you have granted camera permissions.';
      setErrorMessage(message);
      toast.error(message);
      setIsCapturing(false);
    }
  }, [mode, referenceEmbedding]);
  
  const handleSuccess = (embedding: Float32Array) => {
    setIsCapturing(false);
    stopCamera();
    const successMessage = mode === 'register' ? 'Face registered successfully!' : 'Face verified successfully!';
    toast.success(successMessage);
    onSuccess(embedding);
  };
  
  const handleTimeout = () => {
    setIsCapturing(false);
    stopCamera();
    const message = 'Verification timeout. Please try again and make sure to follow the instructions.';
    setErrorMessage(message);
    toast.error(message);
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
  
  const handleClose = () => {
    stopCamera();
    setErrorMessage(null);
    setFeedbackMessage(null);
    onClose();
  };
  
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient">
            {mode === 'register' ? 'Register Your Face' : 'Verify Your Identity'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isCapturing ? (
            <div className="space-y-4">
              <div className="glass-subtle rounded-lg p-4">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Ensure good lighting</li>
                  <li>• Position your face in the center</li>
                  <li>• Follow the on-screen instructions</li>
                  <li>• Keep your face visible for {CFR_CONFIG.MAX_CAPTURE_TIME / 1000} seconds</li>
                </ul>
              </div>
              
              <SecureButton
                onClick={startCapture}
                className="w-full"
                glow
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </SecureButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with challenge */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 right-4">
                    <div className="glass-subtle rounded-lg px-3 py-2">
                      <p className="text-sm font-medium text-white">
                        {currentChallenge}
                      </p>
                    </div>
                  </div>
                  
                  {/* Face guide */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-primary/50 rounded-full" />
                  </div>
                  
                  {/* Status indicators */}
                  <div className="absolute bottom-4 left-4 right-4 space-y-2">
                    {similarity !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        {similarity >= CFR_CONFIG.SIMILARITY_THRESHOLD ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        <span className="text-white">
                          Face Match: {Math.round(similarity * 100)}%
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      {livenessDetected ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-warning animate-spin" />
                      )}
                      <span className="text-white">
                        Liveness: {livenessDetected ? 'Detected' : 'Checking...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feedback message */}
              {feedbackMessage && (
                <div className="glass-subtle rounded-lg p-3 bg-primary/20 border border-primary">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">Verification Feedback</p>
                      <p className="text-sm text-primary/80 mt-1">{feedbackMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {errorMessage && (
                <div className="glass-subtle rounded-lg p-3 bg-destructive/20 border border-destructive">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Verification Failed</p>
                      <p className="text-sm text-destructive/80 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Capturing...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}