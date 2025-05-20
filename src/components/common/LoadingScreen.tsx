import { Loader2 } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 