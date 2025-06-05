import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, Zap } from 'lucide-react';

const ErrorBoundaryTest: React.FC = () => {
  const [shouldThrowError, setShouldThrowError] = useState(false);

  // Trigger a React error for testing
  if (shouldThrowError) {
    throw new Error('Test error from ErrorBoundaryTest component! This is intentional for testing error boundaries.');
  }

  const triggerError = () => {
    setShouldThrowError(true);
  };

  const triggerAsyncError = () => {
    // Async errors aren't caught by error boundaries - this demonstrates the difference
    setTimeout(() => {
      throw new Error('Async error - this will NOT be caught by error boundaries');
    }, 100);
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Error Boundary Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Use these buttons to test error boundary functionality.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={triggerError}
          variant="destructive"
          className="w-full"
        >
          <Zap className="w-4 h-4 mr-2" />
          Trigger React Error
        </Button>
        
        <Button 
          onClick={triggerAsyncError}
          variant="outline"
          className="w-full"
        >
          <Bug className="w-4 h-4 mr-2" />
          Trigger Async Error (Not Caught)
        </Button>
        
        <div className="text-xs text-muted-foreground">
          <p><strong>React Error:</strong> Will be caught by error boundary</p>
          <p><strong>Async Error:</strong> Will show in console, not caught</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorBoundaryTest; 