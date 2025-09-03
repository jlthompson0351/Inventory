import { useState, useEffect } from "react";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { getMappedFields } from "@/services/mappedFieldService";
import { useOrganization } from "@/hooks/useOrganization";

interface MappedField {
  id: string;
  organization_id: string;
  form_id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  form_name?: string;
  description?: string;
}

interface MappedFieldSelectorProps {
  onSelectField: (fieldId: string, fieldLabel: string, formName?: string) => void;
  fields?: MappedField[]; // NEW: Allow passing fields as props for integration with FormBuilder
}

export function MappedFieldSelector({ onSelectField, fields: propFields }: MappedFieldSelectorProps) {
  const [fields, setFields] = useState<MappedField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [expandedForms, setExpandedForms] = useState<Record<string, boolean>>({});
  const { currentOrganization } = useOrganization();

  // Group fields by form
  const fieldsByForm = fields.reduce((acc, field) => {
    const formId = field.form_id;
    if (!acc[formId]) {
      acc[formId] = {
        formName: field.form_name || "Unknown Form",
        fields: []
      };
    }
    acc[formId].fields.push(field);
    return acc;
  }, {} as Record<string, { formName: string; fields: MappedField[] }>);

  useEffect(() => {
    if (propFields) {
      // Use fields passed as props (from FormBuilder with asset data fields)
      setFields(propFields);
      initializeExpandedForms(propFields);
    } else if (currentOrganization?.id) {
      // Fallback to fetching data for backward compatibility
      loadMappedFields();
    }
  }, [propFields, currentOrganization?.id]);

  const initializeExpandedForms = (fieldsData: MappedField[]) => {
    // Initially expand all forms if there are just a few
    if (fieldsData.length > 0) {
      const uniqueFormIds = [...new Set(fieldsData.map(field => field.form_id))];
      if (uniqueFormIds.length <= 3) {
        const initialExpanded = uniqueFormIds.reduce((acc, formId) => {
          acc[formId] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setExpandedForms(initialExpanded);
      }
    }
  };

  const loadMappedFields = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const data = await getMappedFields(currentOrganization.id);
      setFields(data);
      initializeExpandedForms(data);
    } catch (error) {
      console.error("Error loading mapped fields:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormExpanded = (formId: string) => {
    setExpandedForms(prev => ({
      ...prev,
      [formId]: !prev[formId]
    }));
  };

  const filteredFields = filterText 
    ? fields.filter(field => 
        field.field_label.toLowerCase().includes(filterText.toLowerCase()) ||
        (field.form_name && field.form_name.toLowerCase().includes(filterText.toLowerCase()))
      )
    : fields;

  // When filtering, we need to ensure the right forms are expanded
  useEffect(() => {
    if (filterText) {
      const formsToExpand = filteredFields.map(field => field.form_id);
      const newExpandedState = {...expandedForms};
      
      formsToExpand.forEach(formId => {
        newExpandedState[formId] = true;
      });
      
      setExpandedForms(newExpandedState);
    }
  }, [filterText]);

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search fields..."
          className="pl-8"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>
      
      <ScrollArea className="h-[200px] rounded-md border p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading fields...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No mapped fields available.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mark fields as "Mappable" in other forms to use them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filterText && filteredFields.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2 text-center">
                No fields match your search.
              </p>
            ) : (
              Object.entries(fieldsByForm).map(([formId, { formName, fields: formFields }]) => {
                // When filtering, only show forms that have matching fields
                const fieldsToShow = filterText 
                  ? formFields.filter(field => 
                      field.field_label.toLowerCase().includes(filterText.toLowerCase()) ||
                      (formName && formName.toLowerCase().includes(filterText.toLowerCase()))
                    )
                  : formFields;
                
                if (fieldsToShow.length === 0) return null;
                
                return (
                  <Collapsible 
                    key={formId} 
                    open={expandedForms[formId]} 
                    onOpenChange={() => toggleFormExpanded(formId)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:bg-accent p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{formName}</span>
                      </div>
                      <Badge variant="outline">{fieldsToShow.length}</Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1 pl-4">
                      <div className="space-y-1">
                        {fieldsToShow.map(field => (
                          <Button
                            key={field.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs hover:bg-accent"
                            onClick={() => onSelectField(field.field_id, field.field_label, formName)}
                          >
                            <span className="font-medium">{field.field_label}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {field.field_type}
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    </CollapsibleContent>
                    <Separator className="my-2" />
                  </Collapsible>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 