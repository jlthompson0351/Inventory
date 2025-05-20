import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CalendarClock, Construction, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PlaceholderTabProps {
  title: string;
  description: string;
  comingSoon?: boolean;
  estimatedRelease?: string;
}

const PlaceholderTab = ({ 
  title, 
  description, 
  comingSoon = true,
  estimatedRelease
}: PlaceholderTabProps) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Construction className="h-5 w-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="bg-muted/50">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            {comingSoon
              ? `${title} will be available in a future update.`
              : `${title} is currently in development.`}
          </AlertDescription>
        </Alert>
        
        {estimatedRelease && (
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 mr-2" />
            <span>Estimated release: {estimatedRelease}</span>
          </div>
        )}
        
        <div className="rounded-md bg-slate-50 p-4 text-sm">
          <p className="font-medium mb-2">Features to expect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Simplified management interface</li>
            <li>Detailed analytics and reporting</li>
            <li>Integration with your existing workflow</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => toast.info(`We'll notify you when ${title} becomes available!`)}
        >
          Notify me when available
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlaceholderTab;
