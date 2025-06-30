import { supabase } from '@/integrations/supabase/client';

// 🚀 BULLETPROOF: Enhanced Last Month Total Calculator with Fallbacks
export async function getLastMonthTotal(inventoryItemId: string, currentMonth: string): Promise<{
  amount: number;
  source: 'form_submission' | 'inventory_history' | 'calculated' | 'none';
  confidence: 'high' | 'medium' | 'low';
  details: string;
}> {
  try {
    // Parse current month to get previous month
    const [year, month] = currentMonth.split('-').map(Number);
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;
    const lastMonthStr = `${lastYear}-${lastMonth.toString().padStart(2, '0')}`;
    
    // METHOD 1: Look for form submissions with total/ending fields (HIGHEST CONFIDENCE)
    const { data: formSubmissions, error: formError } = await supabase
      .from('form_submissions')
      .select(`
        submission_data,
        created_at
      `)
      .eq('asset_id', inventoryItemId)
      .gte('created_at', `${lastYear}-${lastMonth.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
      .order('created_at', { ascending: false });

    if (!formError && formSubmissions && formSubmissions.length > 0) {
      // Look for the most recent form with total/ending field
      for (const submission of formSubmissions) {
        const data = submission.submission_data || {};
        const totalField = Object.keys(data).find(key => {
          const lowerKey = key.toLowerCase();
          return lowerKey.includes('total') || 
                 lowerKey.includes('ending') || 
                 lowerKey.includes('balance') ||
                 key === 'field_13'; // Known total field for paint inventory
        });
        
        if (totalField && data[totalField] !== undefined && data[totalField] !== '') {
          const amount = Number(data[totalField]) || 0;
          return {
            amount,
            source: 'form_submission',
            confidence: 'high',
            details: `Found in form submission from ${submission.created_at}, field: ${totalField}`
          };
        }
      }
    }

    // METHOD 2: Get last inventory_history record from previous month (MEDIUM CONFIDENCE)
    const { data: historyRecords, error: historyError } = await supabase
      .from('inventory_history')
      .select('quantity, created_at, event_type, month_year')
      .eq('inventory_item_id', inventoryItemId)
      .eq('month_year', lastMonthStr)
      .order('created_at', { ascending: false });

    if (!historyError && historyRecords && historyRecords.length > 0) {
      // Get the last record of the previous month
      const lastRecord = historyRecords[0];
      return {
        amount: Number(lastRecord.quantity) || 0,
        source: 'inventory_history',
        confidence: 'medium',
        details: `Last inventory record from ${lastRecord.created_at}, event: ${lastRecord.event_type}`
      };
    }

    // METHOD 3: Get earliest record of current month (LOW CONFIDENCE)
    const { data: currentMonthHistory, error: currentError } = await supabase
      .from('inventory_history')
      .select('quantity, created_at, event_type')
      .eq('inventory_item_id', inventoryItemId)
      .eq('month_year', currentMonth)
      .order('created_at', { ascending: true })
      .limit(1);

    if (!currentError && currentMonthHistory && currentMonthHistory.length > 0) {
      const firstRecord = currentMonthHistory[0];
      return {
        amount: Number(firstRecord.quantity) || 0,
        source: 'calculated',
        confidence: 'low',
        details: `Using first record quantity from current month: ${firstRecord.created_at}`
      };
    }

    // METHOD 4: No data found
    return {
      amount: 0,
      source: 'none',
      confidence: 'low',
      details: 'No previous month data found'
    };

  } catch (error) {
    console.error('Error calculating last month total:', error);
    return {
      amount: 0,
      source: 'none',
      confidence: 'low',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 🚀 DATA VALIDATION: Check inventory consistency between real-time and forms
export async function validateInventoryConsistency(inventoryItemId: string): Promise<{
  isConsistent: boolean;
  realTimeQuantity: number;
  latestFormTotal: number | null;
  discrepancy: number | null;
  lastFormDate: string | null;
  recommendations: string[];
}> {
  try {
    // Get current real-time quantity
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('quantity, name')
      .eq('id', inventoryItemId)
      .single();

    if (itemError || !inventoryItem) {
      throw new Error('Inventory item not found');
    }

    // Get latest form submission with total field
    const { data: latestForm, error: formError } = await supabase
      .from('form_submissions')
      .select('submission_data, created_at')
      .eq('asset_id', inventoryItemId)
      .order('created_at', { ascending: false })
      .limit(1);

    let latestFormTotal = null;
    let lastFormDate = null;
    let discrepancy = null;
    const recommendations: string[] = [];

    if (!formError && latestForm && latestForm.length > 0) {
      const formData = latestForm[0].submission_data || {};
      const totalField = Object.keys(formData).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('total') || 
               lowerKey.includes('ending') || 
               lowerKey.includes('balance') ||
               key === 'field_13';
      });

      if (totalField && formData[totalField] !== undefined) {
        latestFormTotal = Number(formData[totalField]) || 0;
        lastFormDate = latestForm[0].created_at;
        discrepancy = Math.abs(inventoryItem.quantity - latestFormTotal);

        // Check if discrepancy is significant
        if (discrepancy > 0) {
          const percentageDiscrepancy = latestFormTotal > 0 
            ? (discrepancy / latestFormTotal) * 100 
            : 100;

          if (percentageDiscrepancy > 5) {
            recommendations.push(`⚠️ Significant discrepancy detected: ${discrepancy.toFixed(2)} units (${percentageDiscrepancy.toFixed(1)}%)`);
            recommendations.push('Consider running a manual audit to verify quantities');
          }

          if (percentageDiscrepancy > 20) {
            recommendations.push('🚨 Large discrepancy - immediate investigation recommended');
          }
        }
      }
    } else {
      recommendations.push('No recent form submissions found - consider requiring monthly audits');
    }

    // Check if form data is recent (within 45 days)
    if (lastFormDate) {
      const daysSinceLastForm = Math.floor(
        (new Date().getTime() - new Date(lastFormDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastForm > 45) {
        recommendations.push(`Last form submission was ${daysSinceLastForm} days ago - consider monthly audits`);
      }
    }

    const isConsistent = discrepancy === null || discrepancy < (latestFormTotal ? latestFormTotal * 0.05 : 10);

    return {
      isConsistent,
      realTimeQuantity: inventoryItem.quantity,
      latestFormTotal,
      discrepancy,
      lastFormDate,
      recommendations
    };

  } catch (error) {
    console.error('Error validating inventory consistency:', error);
    return {
      isConsistent: false,
      realTimeQuantity: 0,
      latestFormTotal: null,
      discrepancy: null,
      lastFormDate: null,
      recommendations: [`Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// 🚀 MONTHLY SNAPSHOT: Create a reliable monthly inventory snapshot
export async function createMonthlyInventorySnapshot(inventoryItemId: string, month: string): Promise<{
  success: boolean;
  snapshotData: any;
  source: string;
  message: string;
}> {
  try {
    // Get the last month calculation
    const lastMonthData = await getLastMonthTotal(inventoryItemId, month);
    
    // Validate consistency
    const consistencyCheck = await validateInventoryConsistency(inventoryItemId);
    
    // Get current inventory item details
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('name, quantity, current_price, location, status')
      .eq('id', inventoryItemId)
      .single();

    if (itemError || !inventoryItem) {
      throw new Error('Inventory item not found');
    }

    const snapshotData = {
      inventory_item_id: inventoryItemId,
      item_name: inventoryItem.name,
      month_year: month,
      starting_quantity: lastMonthData.amount,
      starting_source: lastMonthData.source,
      starting_confidence: lastMonthData.confidence,
      current_quantity: inventoryItem.quantity,
      price_per_unit: inventoryItem.current_price,
      location: inventoryItem.location,
      status: inventoryItem.status,
      consistency_check: consistencyCheck,
      snapshot_date: new Date().toISOString(),
      data_quality_score: calculateDataQualityScore(lastMonthData, consistencyCheck)
    };

    return {
      success: true,
      snapshotData,
      source: lastMonthData.source,
      message: `Monthly snapshot created. Source: ${lastMonthData.source} (${lastMonthData.confidence} confidence)`
    };

  } catch (error) {
    console.error('Error creating monthly snapshot:', error);
    return {
      success: false,
      snapshotData: null,
      source: 'error',
      message: `Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper function to calculate data quality score
function calculateDataQualityScore(lastMonthData: any, consistencyCheck: any): number {
  let score = 0;
  
  // Source quality (40% of score)
  switch (lastMonthData.source) {
    case 'form_submission':
      score += 40;
      break;
    case 'inventory_history':
      score += 25;
      break;
    case 'calculated':
      score += 15;
      break;
    default:
      score += 0;
  }
  
  // Confidence level (30% of score)
  switch (lastMonthData.confidence) {
    case 'high':
      score += 30;
      break;
    case 'medium':
      score += 20;
      break;
    case 'low':
      score += 10;
      break;
  }
  
  // Consistency (30% of score)
  if (consistencyCheck.isConsistent) {
    score += 30;
  } else if (consistencyCheck.discrepancy && consistencyCheck.latestFormTotal) {
    const percentageDiscrepancy = (consistencyCheck.discrepancy / consistencyCheck.latestFormTotal) * 100;
    if (percentageDiscrepancy < 10) {
      score += 20;
    } else if (percentageDiscrepancy < 25) {
      score += 10;
    }
  }
  
  return score; // Score out of 100
}

// 🚀 ENHANCED REPORTING: Get comprehensive inventory status for reporting
export async function getInventoryReportingData(inventoryItemId: string, month: string): Promise<{
  item_details: any;
  last_month_total: any;
  consistency_check: any;
  data_quality_score: number;
  recommendations: string[];
}> {
  try {
    const [lastMonthData, consistencyCheck] = await Promise.all([
      getLastMonthTotal(inventoryItemId, month),
      validateInventoryConsistency(inventoryItemId)
    ]);

    const { data: inventoryItem } = await supabase
      .from('inventory_items')
      .select(`
        id,
        name,
        sku,
        quantity,
        current_price,
        currency,
        location,
        status,
        category,
        asset_types(name, color, icon)
      `)
      .eq('id', inventoryItemId)
      .single();

    const dataQualityScore = calculateDataQualityScore(lastMonthData, consistencyCheck);
    
    // Generate comprehensive recommendations
    const recommendations = [
      ...consistencyCheck.recommendations,
      ...(dataQualityScore < 70 ? ['📊 Data quality could be improved - consider more frequent audits'] : []),
      ...(lastMonthData.source === 'none' ? ['📝 No historical data found - establish baseline inventory'] : [])
    ];

    return {
      item_details: inventoryItem,
      last_month_total: lastMonthData,
      consistency_check: consistencyCheck,
      data_quality_score: dataQualityScore,
      recommendations
    };

  } catch (error) {
    console.error('Error getting inventory reporting data:', error);
    throw error;
  }
} 