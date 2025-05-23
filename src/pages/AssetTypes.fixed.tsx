import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Loader2, ArrowUp, ArrowDown, Filter, Copy, RefreshCw, Search, FileText, ListCheck, Package, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { BarcodeToggle } from "@/components/inventory/BarcodeToggle";
import { 
  AssetType, 
  AssetTypeWithCount,
  MothershipAssetType,
  getAssetTypesWithCounts, 
  getMothershipAssetTypes,
  createAssetType, 
  updateAssetType, 
  deleteAssetType,
  cloneAssetType,
  createDefaultFormsForAssetType,
  removeAssetTypeFormLink,
  addAssetTypeFormLink,
  getAssetTypeForms
} from "@/services/assetTypeService";
import { supabase } from "@/integrations/supabase/client"; // Import the supabase client directly
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { getFormsByAssetType, getForms } from '@/services/formService';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Color options for asset types
const colorOptions = [
  "#6E56CF", "#0EA5E9", "#10B981", "#EAB308", "#EF4444", 
  "#F97316", "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6"
];

type SortField = "name" | "asset_count" | "created_at";

const AssetTypes = () => {
  // (Rest of the component code remains the same...)

  // Function to suggest the most appropriate purpose for a form based on its name
  const suggestFormPurpose = (formName: string): string => {
    const name = formName.toLowerCase();
    
    if (name.includes('intake') || name.includes('add') || name.includes('new') || name.includes('create')) {
      return 'intake';
    }
    
    if (name.includes('inventory') || name.includes('check') || name.includes('list') || name.includes('manage')) {
      return 'inventory';
    }
    
    if (name.includes('adjust') || name.includes('update') || name.includes('modify') || name.includes('change')) {
      return 'adjustment';
    }
    
    if (name.includes('transfer') || name.includes('move') || name.includes('relocate') || name.includes('transport')) {
      return 'transfer';
    }
    
    // Default to intake if no match
    return 'intake';
  };

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    const loadFormsForAllAssetTypes = async () => {
      if (!currentOrganization?.id || assetTypes.length === 0) return;
      
      const formsMap: { [assetTypeId: string]: any[] } = {};
      
      // Initialize with empty arrays for each asset type
      assetTypes.forEach(assetType => {
        formsMap[assetType.id] = [];
      });
      
      // Load forms for each asset type in parallel
      await Promise.all(assetTypes.map(async (assetType) => {
        try {
          const forms = await getAssetTypeForms(assetType.id, currentOrganization.id);
          formsMap[assetType.id] = forms || [];
        } catch (e) {
          console.error(`Error fetching forms for asset type ${assetType.id}:`, e);
          formsMap[assetType.id] = [];
        }
      }));
      
      setAssetTypeForms(formsMap);
    };
    
    loadFormsForAllAssetTypes();
  }, [assetTypes, currentOrganization]);

  if (!currentOrganization && activeView === "normal") {
    // (Rest of the component code remains the same...)
  }

  return (
    // (Component JSX remains the same...)
  );
};

export default AssetTypes; 