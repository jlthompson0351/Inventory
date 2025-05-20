import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  organization_id: string;
  asset_type_id?: string;
  sku?: string;
  barcode?: string;
  current_price?: number;
  currency?: string;
  metadata?: any;
}

interface UseInventoryProps {
  organizationId: string;
  assetTypeId?: string;
}

export function useInventory({ organizationId, assetTypeId }: UseInventoryProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch inventory items
  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', organizationId);
        
      if (assetTypeId) {
        query = query.eq('asset_type_id', assetTypeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Update item quantity
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date()
        })
        .eq('id', itemId);
        
      if (error) throw error;
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
      
      return { success: true };
    } catch (err) {
      console.error('Error updating quantity:', err);
      return { success: false, error: err };
    }
  };
  
  // Adjust quantity (add or subtract)
  const adjustQuantity = async (itemId: string, adjustment: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return { success: false, error: new Error('Item not found') };
    
    const newQuantity = Math.max(0, item.quantity + adjustment);
    return updateQuantity(itemId, newQuantity);
  };
  
  // Add new inventory item
  const addInventoryItem = async (newItem: Omit<InventoryItem, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ 
          ...newItem,
          organization_id: organizationId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update local state
      setInventory(prev => [...prev, data]);
      
      return { success: true, item: data };
    } catch (err) {
      console.error('Error adding inventory item:', err);
      return { success: false, error: err };
    }
  };
  
  // Delete inventory item
  const deleteInventoryItem = async (itemId: string) => {
    try {
      // Use the RPC function to handle cascading deletion
      const { error } = await supabase.rpc('delete_inventory_item', { 
        item_id: itemId 
      });
        
      if (error) throw error;
      
      // Update local state
      setInventory(prev => prev.filter(item => item.id !== itemId));
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      return { success: false, error: err };
    }
  };
  
  // Load inventory on component mount
  useEffect(() => {
    if (organizationId) {
      fetchInventory();
    }
  }, [organizationId, assetTypeId]);
  
  return {
    inventory,
    loading,
    error,
    refreshInventory: fetchInventory,
    updateQuantity,
    adjustQuantity, 
    addInventoryItem,
    deleteInventoryItem
  };
} 