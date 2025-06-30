import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Barcode, ListFilter, ListTree, Loader2, ArrowLeft } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox'; 
import { useOrganization } from '@/hooks/useOrganization';
import { getAssetTypes } from '@/services/assetTypeService';
import { getInventoryItems, getInventoryHistoryForMonth } from '@/services/inventoryService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AddItemSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Helper to get asset IDs with a 'periodic' inventory entry for the current month
async function getAssetIdsWithPeriodicInventory(organizationId: string, monthYear: string) {
  // Get all inventory items for the org
  const inventoryItems = await getInventoryItems(organizationId);
  if (!inventoryItems) return new Set();
  const inventoryItemIds = inventoryItems.map(item => item.id);
  if (inventoryItemIds.length === 0) return new Set();
  // Query inventory_history for 'periodic' entries for this month
  const { data: history, error } = await supabase
    .from('inventory_history')
    .select('inventory_item_id')
    .in('inventory_item_id', inventoryItemIds)
    .eq('month_year', monthYear)
    .eq('check_type', 'periodic');
  if (error) {
    console.error('Error fetching inventory_history:', error);
    return new Set();
  }
  // Map inventory_item_id to asset_id
  const itemIdToAssetId = new Map(inventoryItems.map(item => [item.id, item.asset_id]));
  const assetIds = new Set((history || []).map(h => itemIdToAssetId.get(h.inventory_item_id)));
  return assetIds;
}

const AddItemSelectionModal: React.FC<AddItemSelectionModalProps> = ({ isOpen, onOpenChange }) => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [selectionStep, setSelectionStep] = useState<'initial' | 'selectByType' | 'selectAll'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  
  // States for data
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null);
  const [assetsOfType, setAssetsOfType] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);

  // Fetch data when modal opens and dependencies change
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      if (selectionStep === 'selectByType' && assetTypes.length === 0) {
        fetchAssetTypes();
      }
      if (selectionStep === 'selectAll' && allAssets.length === 0) {
        fetchAllAssets();
      }
    }
  }, [isOpen, selectionStep, currentOrganization?.id]);

  // Fetch assets when an asset type is selected
  useEffect(() => {
    if (selectedAssetType && currentOrganization?.id) {
      fetchAssetsByType(selectedAssetType);
    }
  }, [selectedAssetType, currentOrganization?.id]);

  const fetchAssetTypes = async () => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      const types = await getAssetTypes(currentOrganization.id);
      setAssetTypes(types || []);
    } catch (error) {
      toast.error("Failed to load asset types.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllAssets = async () => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      // Fetch all assets
      const { data: allAssetsData, error: allAssetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('deleted_at', null);
      if (allAssetsError) {
        console.error('Supabase error loading all assets:', allAssetsError);
        throw allAssetsError;
      }
      // Get asset IDs with a 'periodic' entry for this month
      const monthYear = format(new Date(), 'yyyy-MM');
      const assetIdsWithPeriodic = await getAssetIdsWithPeriodicInventory(currentOrganization.id, monthYear);
      // Only show assets that do NOT have a 'periodic' entry for this month
      const availableAssets = (allAssetsData || []).filter(asset => !assetIdsWithPeriodic.has(asset.id));
      setAllAssets(availableAssets);
    } catch (error) {
      toast.error("Failed to load assets.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssetsByType = async (typeId: string) => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      // Fetch all assets of this type
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('asset_type_id', typeId)
        .is('deleted_at', null);
      if (assetsError) {
        console.error('Supabase error loading assets by type:', assetsError);
        throw assetsError;
      }
      // Get asset IDs with a 'periodic' entry for this month
      const monthYear = format(new Date(), 'yyyy-MM');
      const assetIdsWithPeriodic = await getAssetIdsWithPeriodicInventory(currentOrganization.id, monthYear);
      // Only show assets of this type that do NOT have a 'periodic' entry for this month
      const availableAssets = (assetsData || []).filter(asset => !assetIdsWithPeriodic.has(asset.id));
      setAssetsOfType(availableAssets);
    } catch (error) {
      toast.error("Failed to load assets for this type.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanClick = () => {
    navigate('/scan');
    onOpenChange(false);
  };

  const handleSelectByTypeClick = () => {
    setSelectionStep('selectByType');
    // Fetching happens in useEffect
  };
  
  const handleSelectAllClick = () => {
    setSelectionStep('selectAll');
     // Fetching happens in useEffect
  };

  const handleAssetTypeSelect = (typeId: string | null) => {
    setSelectedAssetType(typeId);
    if (!typeId) {
      setAssetsOfType([]); // Clear assets if type is deselected
    }
    // Fetching happens in useEffect
  };
  
  const handleAssetSelect = async (assetId: string) => {
    // First, verify the asset still exists
    try {
      if (!currentOrganization?.id) return;
      
      // Verify asset exists before proceeding
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .is('deleted_at', null)
        .single();
        
      if (assetError || !assetData) {
        toast.error(`The selected asset no longer exists. It may have been deleted.`);
        // Refresh the asset list to remove this invalid asset
        if (selectionStep === 'selectByType' && selectedAssetType) {
          fetchAssetsByType(selectedAssetType);
        } else if (selectionStep === 'selectAll') {
          fetchAllAssets();
        }
        return;
      }
      
      // Continue with existing logic for inventory check
      const items = await getInventoryItems(currentOrganization.id, assetId);
      const inventoryItem = items && items.length > 0 ? items[0] : null;
      const monthYear = new Date().toISOString().slice(0, 7);
      if (inventoryItem) {
        const history = await getInventoryHistoryForMonth(inventoryItem.id, monthYear);
        if (history && history.event_type === 'check') {
          // Route to edit mode (could be a dedicated edit page or modal)
          navigate(`/inventory/item/${inventoryItem.id}?month=${monthYear}&edit=1`);
          resetState();
          return;
        }
      }
      // If only intake exists or none, allow add
      navigate(`/inventory/add/${assetId}`);
      resetState();
    } catch (error) {
      console.error('Error selecting asset:', error);
      toast.error('There was a problem selecting this asset. Please try again.');
    }
  };

  const handleBack = () => {
    setSelectedAssetType(null);
    setAssetsOfType([]);
    setSelectionStep('initial');
  }

  const resetState = () => {
    onOpenChange(false);
    setSelectionStep('initial');
    setSelectedAssetType(null);
    setAssetsOfType([]);
    // Keep fetched asset types and allAssets cached in state for the session
  }

  const renderInitialStep = () => (
    <div className="flex flex-col space-y-4 p-6">
      <Button variant="outline" onClick={handleScanClick}>
        <Barcode className="mr-2 h-4 w-4" />
        Scan Barcode/QR Code
      </Button>
      <Button variant="outline" onClick={handleSelectByTypeClick}>
        <ListFilter className="mr-2 h-4 w-4" />
        Select by Asset Type
      </Button>
       <Button variant="outline" onClick={handleSelectAllClick}>
        <ListTree className="mr-2 h-4 w-4" />
        Select from All Assets
      </Button>
    </div>
  );

  const renderSelectByTypeStep = () => (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
         <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <h3 className="font-semibold">Select Asset Type</h3>
      {isLoading && assetTypes.length === 0 ? (
        <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Combobox
          items={assetTypes.map(type => ({ value: type.id, label: type.name }))}
          value={selectedAssetType}
          onChange={handleAssetTypeSelect}
          placeholder="Search asset types..."
          searchPlaceholder="Search types..."
          emptyPlaceholder="No asset types found."
        />
      )}
      
      {selectedAssetType && (
        <div className="mt-4 space-y-2">
           <h3 className="font-semibold">Select Asset</h3>
            {isLoading && assetsOfType.length === 0 ? (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <Combobox
                items={assetsOfType.map(asset => ({ value: asset.id, label: asset.name }))}
                value={null} // Reset value after selection
                onChange={handleAssetSelect} // Directly navigate on selection
                placeholder="Search assets of this type..."
                searchPlaceholder="Search assets..."
                emptyPlaceholder="No assets found for this type."
              />
            )}
        </div>
      )}
    </div>
  );
  
  const renderSelectAllStep = () => (
     <div className="p-6 space-y-4">
       <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
         <ArrowLeft className="mr-2 h-4 w-4" /> Back
       </Button>
       <h3 className="font-semibold">Select Asset</h3>
       {isLoading && allAssets.length === 0 ? (
         <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
       ) : (
          <Combobox
            items={allAssets.map(asset => ({ value: asset.id, label: asset.name }))}
            value={null} // Reset value after selection
            onChange={handleAssetSelect} // Directly navigate on selection
            placeholder="Search all assets..."
            searchPlaceholder="Search assets..."
            emptyPlaceholder="No assets found."
          />
       )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      if (!open) resetState(); 
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory to Existing Asset</DialogTitle>
           <DialogDescription>
             Choose the asset you want to add inventory data for.
           </DialogDescription>
        </DialogHeader>
        {selectionStep === 'initial' && renderInitialStep()}
        {selectionStep === 'selectByType' && renderSelectByTypeStep()}
        {selectionStep === 'selectAll' && renderSelectAllStep()}
      </DialogContent>
    </Dialog>
  );
};

export default AddItemSelectionModal; 