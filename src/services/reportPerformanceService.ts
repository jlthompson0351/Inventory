import { supabase } from '@/integrations/supabase/client';

/**
 * Report Performance Service
 * 
 * Utilizes new database optimizations including materialized views,
 * performance functions, and optimized indexes for faster reporting.
 */

export interface AssetSummaryStats {
  organization_id: string;
  asset_type_id: string;
  asset_type_name: string;
  asset_type_color: string;
  total_assets: number;
  assets_with_submissions: number;
  total_submissions: number;
  last_submission_date: string | null;
  first_asset_created: string;
  last_asset_created: string;
}

export interface MonthlyActivity {
  organization_id: string;
  asset_type_id: string;
  asset_type_name: string;
  month_year: string;
  submission_count: number;
  unique_assets_submitted: number;
}

export interface PerformanceMetric {
  metric_name: string;
  metric_value: string;
  recommendation: string;
}

/**
 * Get pre-computed asset summary statistics using materialized view
 * This is much faster than computing on-demand for dashboard displays
 */
export const getAssetSummaryStats = async (
  organizationId: string
): Promise<AssetSummaryStats[]> => {
  const { data, error } = await supabase
    .from('mv_asset_summary')
    .select('*')
    .eq('organization_id', organizationId)
    .order('asset_type_name');

  if (error) {
    console.error('Error fetching asset summary stats:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get monthly submission activity trends using materialized view
 * Perfect for charts and analytics dashboards
 */
export const getMonthlySubmissionActivity = async (
  organizationId: string,
  months: number = 12
): Promise<MonthlyActivity[]> => {
  const { data, error } = await supabase
    .from('mv_monthly_submission_activity')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('month_year', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('month_year', { ascending: false });

  if (error) {
    console.error('Error fetching monthly activity:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fast asset count using optimized database function
 */
export const getAssetCountOptimized = async (
  organizationId: string,
  assetTypeId?: string,
  includeDeleted: boolean = false
): Promise<number> => {
  const { data, error } = await supabase.rpc('get_asset_count_by_type', {
    p_organization_id: organizationId,
    p_asset_type_id: assetTypeId || null,
    p_include_deleted: includeDeleted
  });

  if (error) {
    console.error('Error getting asset count:', error);
    throw error;
  }

  return data || 0;
};

/**
 * Get latest submission for a specific asset using optimized function
 */
export const getLatestSubmissionOptimized = async (
  assetId: string
): Promise<{
  submission_id: string;
  submission_data: any;
  created_at: string;
  form_id: string;
} | null> => {
  const { data, error } = await supabase.rpc('get_latest_submission_for_asset', {
    p_asset_id: assetId
  });

  if (error) {
    console.error('Error getting latest submission:', error);
    throw error;
  }

  return data?.[0] || null;
};

/**
 * Get submission counts for time series charts
 */
export const getSubmissionTimeSeriesData = async (
  organizationId: string,
  startDate: Date,
  endDate: Date,
  assetTypeId?: string
): Promise<{ date_bucket: string; submission_count: number }[]> => {
  const { data, error } = await supabase.rpc('get_submission_count_in_range', {
    p_organization_id: organizationId,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
    p_asset_type_id: assetTypeId || null
  });

  if (error) {
    console.error('Error getting submission time series:', error);
    throw error;
  }

  return data || [];
};

/**
 * Refresh materialized views for updated data
 * Call this after bulk data operations or on a schedule
 */
export const refreshReportViews = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('refresh_report_materialized_views');
    
    if (error) {
      console.error('Error refreshing materialized views:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to refresh materialized views:', error);
    return false;
  }
};

/**
 * Get performance analysis and recommendations
 */
export const getPerformanceAnalysis = async (): Promise<PerformanceMetric[]> => {
  const { data, error } = await supabase.rpc('analyze_report_performance');

  if (error) {
    console.error('Error analyzing performance:', error);
    throw error;
  }

  return data || [];
};

/**
 * Utility function to check if materialized views need refresh
 * Returns true if views are older than specified minutes
 */
export const checkViewFreshness = async (maxAgeMinutes: number = 60): Promise<boolean> => {
  try {
    // This would need a custom function to check pg_stat_user_tables
    // For now, return true to indicate refresh needed after 1 hour
    const lastRefresh = localStorage.getItem('report_views_last_refresh');
    if (!lastRefresh) return true;
    
    const lastRefreshTime = new Date(lastRefresh);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastRefreshTime.getTime()) / (1000 * 60);
    
    return ageMinutes > maxAgeMinutes;
  } catch (error) {
    console.error('Error checking view freshness:', error);
    return true; // Default to refresh if we can't check
  }
};

/**
 * Smart refresh function that only refreshes if views are stale
 */
export const smartRefreshViews = async (maxAgeMinutes: number = 60): Promise<boolean> => {
  try {
    const needsRefresh = await checkViewFreshness(maxAgeMinutes);
    
    if (needsRefresh) {
      const success = await refreshReportViews();
      if (success) {
        localStorage.setItem('report_views_last_refresh', new Date().toISOString());
      }
      return success;
    }
    
    return true; // No refresh needed
  } catch (error) {
    console.error('Error in smart refresh:', error);
    return false;
  }
};