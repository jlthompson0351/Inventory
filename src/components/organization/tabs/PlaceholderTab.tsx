
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

const PlaceholderTab = ({ title, description }: PlaceholderTabProps) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {title} will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
};

export default PlaceholderTab;
