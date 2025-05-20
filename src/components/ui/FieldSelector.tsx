import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FieldOption {
  id: string;
  label: string;
  type: string;
}

interface FieldSelectorProps {
  fields: FieldOption[];
  onSelectField: (fieldId: string, fieldLabel: string) => void;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonLabel?: string;
}

export function FieldSelector({
  fields,
  onSelectField,
  buttonVariant = "outline",
  buttonSize = "sm", 
  buttonLabel = "Insert Field"
}: FieldSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter fields based on search query
  const filteredFields = fields.filter(field => 
    field.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-none focus-visible:ring-0"
            />
          </div>
        </div>
        
        <div className="max-h-60 overflow-y-auto py-1">
          {filteredFields.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No fields found
            </div>
          ) : (
            filteredFields.map(field => (
              <button
                key={field.id}
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => {
                  onSelectField(field.id, field.label);
                  setSearchQuery("");
                }}
              >
                <span className="font-medium">{field.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">{field.type}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 