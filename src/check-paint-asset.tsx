import { supabase } from './integrations/supabase/client';

// Function to check if paint asset type exists
async function checkPaintAssetType() {
  try {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .ilike('name', '%paint%'); // Case-insensitive search for paint in name field
      
    if (error) {
      console.error('Error querying asset types:', error);
      return;
    }
    
    console.log('Found asset types matching "paint":', data);
    
    if (data && data.length > 0) {
      console.log('Paint asset type exists!');
      data.forEach(type => {
        console.log(`- ID: ${type.id}, Name: ${type.name}, Color: ${type.color}`);
      });
    } else {
      console.log('No paint asset type found in the database.');
    }
  } catch (err) {
    console.error('Error in checkPaintAssetType:', err);
  }
}

// Run the check
checkPaintAssetType();

// Export so it's a valid module
export {}; 