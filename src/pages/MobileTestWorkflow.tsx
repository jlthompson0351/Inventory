import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Smartphone, Settings, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MobileAssetWorkflow from "./MobileAssetWorkflow";

const MobileTestWorkflow = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet'>('mobile');
  const [showDevTools, setShowDevTools] = useState(true);

  // Device dimensions
  const dimensions = {
    mobile: {
      portrait: { width: 375, height: 667 },
      landscape: { width: 667, height: 375 }
    },
    tablet: {
      portrait: { width: 768, height: 1024 },
      landscape: { width: 1024, height: 768 }
    }
  };

  const currentDimensions = dimensions[deviceType][orientation];

  const handleGoBack = () => {
    window.close();
  };

  const toggleOrientation = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  };

  const resetToPortrait = () => {
    setOrientation('portrait');
    setDeviceType('mobile');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Testing Controls Header */}
      {showDevTools && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-lg text-blue-900">Mobile Testing Interface</CardTitle>
                  <p className="text-sm text-blue-700 mt-1">
                    Testing Asset ID: <code className="bg-blue-100 px-1 rounded">{assetId}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {deviceType === 'mobile' ? 'Mobile' : 'Tablet'} - {orientation}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDevTools(false)}
                  className="text-blue-600 border-blue-200"
                >
                  Hide Tools
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleOrientation}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Rotate ({orientation})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeviceType(prev => prev === 'mobile' ? 'tablet' : 'mobile')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {deviceType === 'mobile' ? 'Switch to Tablet' : 'Switch to Mobile'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToPortrait}
                  className="gap-2"
                >
                  Reset
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  className="gap-2 text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Close Test
                </Button>
              </div>

              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded">
                Viewport: {currentDimensions.width} × {currentDimensions.height}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Dev Tools Toggle */}
      {!showDevTools && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDevTools(true)}
          className="fixed top-4 right-4 z-50 bg-blue-50 border-blue-200 text-blue-600"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      {/* Mobile Viewport Simulation */}
      <div className="flex justify-center">
        <div 
          className="bg-white border-8 border-gray-800 rounded-3xl shadow-2xl overflow-hidden relative"
          style={{
            width: currentDimensions.width + 16, // Add border width
            height: currentDimensions.height + 16,
            maxWidth: '100%',
            maxHeight: showDevTools ? 'calc(100vh - 200px)' : 'calc(100vh - 50px)'
          }}
        >
          {/* Mobile Device Frame */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full"></div>
          <div className="absolute top-4 right-4 w-2 h-2 bg-gray-600 rounded-full"></div>
          
          {/* Mobile Content Container */}
          <div 
            className="w-full h-full overflow-auto"
            style={{
              width: currentDimensions.width,
              height: currentDimensions.height
            }}
          >
            {/* Inject the actual MobileAssetWorkflow component */}
            <div className="mobile-test-wrapper">
              <MobileAssetWorkflow />
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for mobile simulation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .mobile-test-wrapper {
            font-size: ${deviceType === 'mobile' ? '14px' : '16px'};
          }
          
          .mobile-test-wrapper * {
            box-sizing: border-box;
          }
          
          /* Force mobile-like styling */
          .mobile-test-wrapper .container {
            max-width: 100% !important;
            padding: 1rem !important;
          }
          
          /* Simulate touch interactions */
          .mobile-test-wrapper button:hover {
            transform: scale(0.98);
            transition: transform 0.1s ease;
          }
          
          /* Mobile-optimized scrollbars */
          .mobile-test-wrapper ::-webkit-scrollbar {
            width: 3px;
          }
          
          .mobile-test-wrapper ::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          .mobile-test-wrapper ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 3px;
          }
        `
      }} />
    </div>
  );
};

export default MobileTestWorkflow;
