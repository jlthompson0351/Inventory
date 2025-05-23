import { useState } from 'react';
import { Copy, Check, Database, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface MappedField {
  id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  form_name: string;
  source: 'conversion' | 'form';
  description?: string;
}

interface FieldReferenceHelperProps {
  currentFields: FormField[];
  mappedFields: MappedField[];
  onInsertReference?: (reference: string) => void;
  className?: string;
}

export default function FieldReferenceHelper({ 
  currentFields, 
  mappedFields, 
  onInsertReference,
  className = "" 
}: FieldReferenceHelperProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedRef(reference);
      setTimeout(() => setCopiedRef(null), 2000);
      toast({
        title: "Copied!",
        description: `Reference ${reference} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleInsert = (reference: string) => {
    if (onInsertReference) {
      onInsertReference(reference);
    } else {
      copyToClipboard(reference);
    }
  };

  const filteredCurrentFields = currentFields.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappedFields = mappedFields.filter(field =>
    field.field_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.field_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.form_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conversionFields = filteredMappedFields.filter(f => f.source === 'conversion');
  const formFields = filteredMappedFields.filter(f => f.source === 'form');

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Field References
        </CardTitle>
        <Input
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Form</TabsTrigger>
            <TabsTrigger value="conversion">Conversions</TabsTrigger>
            <TabsTrigger value="mapped">Mapped</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredCurrentFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No current form fields
                  </p>
                ) : (
                  filteredCurrentFields.map((field) => {
                    const reference = `{${field.id}}`;
                    const isCopied = copiedRef === reference;
                    
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {reference}
                            </code>
                            <Badge variant="outline" className="text-[10px]">
                              {field.type}
                            </Badge>
                          </div>
                          <p className="text-sm truncate mt-1">{field.label}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-8 w-8 p-0"
                          onClick={() => handleInsert(reference)}
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="conversion" className="mt-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {conversionFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No conversion fields available
                  </p>
                ) : (
                  conversionFields.map((field) => {
                    const reference = `{${field.field_id}}`;
                    const isCopied = copiedRef === reference;
                    
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
                              {reference}
                            </code>
                            <Badge variant="secondary" className="text-[10px]">
                              <Zap className="h-2 w-2 mr-1" />
                              {field.field_type}
                            </Badge>
                          </div>
                          <p className="text-sm truncate mt-1">{field.field_label}</p>
                          {field.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {field.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-8 w-8 p-0"
                          onClick={() => handleInsert(reference)}
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="mapped" className="mt-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {formFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No mapped fields available
                  </p>
                ) : (
                  formFields.map((field) => {
                    const reference = `{mapped.${field.field_id}}`;
                    const isCopied = copiedRef === reference;
                    
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-mono">
                              {reference}
                            </code>
                            <Badge variant="outline" className="text-[10px]">
                              {field.field_type}
                            </Badge>
                          </div>
                          <p className="text-sm truncate mt-1">{field.field_label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            from {field.form_name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-8 w-8 p-0"
                          onClick={() => handleInsert(reference)}
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {onInsertReference ? 'Click to insert' : 'Click to copy to clipboard'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 