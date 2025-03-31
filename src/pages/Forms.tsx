
import { Link } from "react-router-dom";
import { FileInput, MoreVertical, Plus, FileCheck, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock form templates data
const formTemplates = [
  { id: 1, name: "Basic Inventory Form", fields: 8, created: "2023-05-12", lastUsed: "2023-06-01" },
  { id: 2, name: "Equipment Inspection", fields: 12, created: "2023-04-20", lastUsed: "2023-05-28" },
  { id: 3, name: "Asset Transfer Form", fields: 10, created: "2023-06-05", lastUsed: "2023-06-10" },
];

const Forms = () => {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage inventory forms</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link to="/forms/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Form
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <FilePlus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Create New Form</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Build a custom form for your inventory needs
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/forms/new">
                <Plus className="mr-2 h-4 w-4" />
                New Form
              </Link>
            </Button>
          </CardContent>
        </Card>

        {formTemplates.map((template) => (
          <Card key={template.id} className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-primary/10 p-1.5 mr-2">
                    <FileInput className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link to={`/forms/${template.id}`} className="flex w-full">
                        Edit form
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>Export</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fields:</span>
                  <span>{template.fields}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(template.created).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last used:</span>
                  <span>{new Date(template.lastUsed).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to={`/forms/${template.id}`}>
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to={`/forms/${template.id}/fill`}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Fill Form
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Forms;
