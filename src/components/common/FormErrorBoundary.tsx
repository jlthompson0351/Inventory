import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, RefreshCw } from 'lucide-react';

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  formName?: string;
  onRetry?: () => void;
  showDetails?: boolean;
}

const FormErrorFallback: React.FC<{
  formName?: string;
  onRetry?: () => void;
  errorId: string;
}> = ({ formName, onRetry, errorId }) => (
  <Card className="border-red-200 bg-red-50">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <CardTitle className="text-lg text-red-900">
            Form Error
          </CardTitle>
          <p className="text-sm text-red-700 mt-1">
            {formName ? `The ${formName} form` : 'This form'} encountered an error and couldn't be displayed.
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="space-y-3">
        <div className="text-xs text-red-600 bg-white p-2 rounded border border-red-200 font-mono">
          Error ID: {errorId}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button 
              onClick={onRetry}
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Form
            </Button>
          )}
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
        
        <div className="text-xs text-red-600 text-center">
          You may want to try refreshing the page or check your internet connection.
        </div>
      </div>
    </CardContent>
  </Card>
);

const FormErrorBoundary: React.FC<FormErrorBoundaryProps> = ({ 
  children, 
  formName, 
  onRetry,
  showDetails = false 
}) => {
  return (
    <ErrorBoundary
      context={formName ? `${formName} form` : 'form'}
      showDetails={showDetails}
      fallback={
        <FormErrorFallback 
          formName={formName}
          onRetry={onRetry}
          errorId={Date.now().toString(36) + Math.random().toString(36).substr(2)}
        />
      }
      onError={(error, errorInfo) => {
        // Log form-specific error details
        console.error(`Form Error in ${formName || 'Unknown Form'}:`, {
          error: error.message,
          formName,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default FormErrorBoundary; 