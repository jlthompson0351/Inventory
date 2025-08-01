import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, RefreshCw, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
  title?: string;
  facingMode?: 'user' | 'environment';
  className?: string;
}

export function BarcodeScanner({
  onScan,
  onClose,
  title = 'Scan Barcode',
  facingMode = 'environment',
  className = '',
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);

  // Load dynamically to avoid SSR issues
  const [jsQR, setJsQR] = useState<any>(null);

  useEffect(() => {
    // Dynamically import jsQR
    import('jsqr').then(module => {
      setJsQR(module.default);
    }).catch(err => {
      setError('Failed to load barcode scanning library. Please try again.');
      console.error('Error loading jsQR:', err);
    });

    return () => {
      // Clean up when component unmounts
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraEnabled(true);
        startScanning();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or not available. Please check your permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (scanIntervalRef.current) {
      window.cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setCameraEnabled(false);
    setIsScanning(false);
  };

  const startScanning = () => {
    if (!jsQR) return;
    
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !jsQR) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for scanning
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Scan for QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code) {
        // Found a QR code!
        // Detected QR code
        
        // Draw box around QR code
        drawBox(context, code.location);
        
        // Call onScan callback with the scanned data
        onScan(code.data);
        
        // Stop scanning but keep camera on for feedback
        if (scanIntervalRef.current) {
          window.cancelAnimationFrame(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        
        // Restart scanning after a short delay
        setTimeout(() => {
          scanIntervalRef.current = requestAnimationFrame(scanFrame);
        }, 2000);
      } else {
        // Continue scanning
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
      }
    };
    
    scanIntervalRef.current = requestAnimationFrame(scanFrame);
  };

  const drawBox = (context: CanvasRenderingContext2D, location: any) => {
    // Draw lines between corners
    context.beginPath();
    context.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    context.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    context.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    context.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    context.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);
    context.lineWidth = 4;
    context.strokeStyle = '#00FF00';
    context.stroke();
    
    // Draw corner dots
    [
      location.topLeftCorner,
      location.topRightCorner,
      location.bottomRightCorner,
      location.bottomLeftCorner
    ].forEach(corner => {
      context.beginPath();
      context.arc(corner.x, corner.y, 8, 0, 2 * Math.PI);
      context.fillStyle = '#00FF00';
      context.fill();
    });
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative bg-black rounded-md overflow-hidden" style={{ minHeight: '240px' }}>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <video 
              ref={videoRef}
              className="w-full h-auto" 
              playsInline 
              muted
              style={{ display: cameraEnabled ? 'block' : 'none' }}
            />
            
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full"
              style={{ display: 'none' }}
            />
            
            {!cameraEnabled && !error && (
              <div className="flex flex-col items-center justify-center h-full py-10">
                <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground mb-4">
                  Camera is not active. Click the button below to start scanning.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            {!cameraEnabled ? (
              <Button onClick={startCamera} disabled={isScanning && !cameraEnabled}>
                <Camera className="mr-2 h-4 w-4" />
                {isScanning ? 'Activating Camera...' : 'Start Camera'}
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline">
                <XIcon className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            )}
            
            {cameraEnabled && (
              <Button onClick={() => startScanning()} variant="outline" className="ml-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan
              </Button>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Position the barcode or QR code in the center of the camera view
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 