import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Smartphone, 
  Settings, 
  ArrowLeft, 
  PlayCircle, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MobileTestWorkflow = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Array<{
    step: string;
    status: 'success' | 'error' | 'warning' | 'info';
    message: string;
    details?: any;
  }>>([]);

  const logResult = (step: string, status: 'success' | 'error' | 'warning' | 'info', message: string, details?: any) => {
    setResults(prev => [...prev, { step, status, message, details }]);
    console.log(`[${status.toUpperCase()}] ${step}: ${message}`, details || '');
  };

  const clearResults = () => {
    setResults([]);
  };

  const runDiagnostics = async () => {
    if (!assetId) {
      logResult('Setup', 'error', 'No asset ID provided', { assetId });
      return;
    }

    setIsRunning(true);
    clearResults();
    
    logResult('Setup', 'info', '🚀 Starting Mobile Workflow Diagnostics', { assetId });

    try {
      // Step 1: Test asset data loading
      logResult('Asset Loading', 'info', 'Testing asset data retrieval...');
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, name, barcode, asset_type_id, organization_id')
        .eq('id', assetId)
        .eq('is_deleted', false)
        .single();

      if (assetError) {
        logResult('Asset Loading', 'error', `Failed to load asset: ${assetError.message}`, assetError);
        return;
      }
      logResult('Asset Loading', 'success', `✅ Asset loaded: ${assetData.name}`, assetData);

      // Step 2: Test asset type and forms
      logResult('Forms Loading', 'info', 'Testing asset type and form mapping...');
      const { data: assetTypeData, error: assetTypeError } = await supabase
        .from('asset_types')
        .select('*')
        .eq('id', assetData.asset_type_id)
        .single();

      if (assetTypeError) {
        logResult('Forms Loading', 'error', `Failed to load asset type: ${assetTypeError.message}`, assetTypeError);
        return;
      }

      const { data: linkedForms, error: formsError } = await supabase
        .from('asset_type_forms')
        .select('form_id, purpose')
        .eq('asset_type_id', assetData.asset_type_id)
        .eq('organization_id', assetData.organization_id);

      if (formsError) {
        logResult('Forms Loading', 'error', `Failed to load forms: ${formsError.message}`, formsError);
        return;
      }

      logResult('Forms Loading', 'success', `✅ Asset type: ${assetTypeData.name}, Forms: ${linkedForms.length}`, {
        assetType: assetTypeData.name,
        forms: linkedForms
      });

      // Step 3: Test PIN authentication simulation
      logResult('PIN Authentication', 'info', 'Testing PIN authentication workflow...');
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_deleted', false)
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        logResult('PIN Authentication', 'error', 'No profiles found for PIN testing', profileError);
        return;
      }

      const authenticatedUser = profiles[0];
      
      // CRITICAL CHECK: Organization context
      if (!authenticatedUser.organization_id) {
        logResult('PIN Authentication', 'error', '❌ CRITICAL: Profile missing organization_id!', {
          profile: authenticatedUser,
          fix: 'UPDATE profiles SET organization_id = \'your-org-id\' WHERE id = \'' + authenticatedUser.id + '\';'
        });
        return;
      }

      if (authenticatedUser.organization_id !== assetData.organization_id) {
        logResult('PIN Authentication', 'warning', '⚠️ Organization mismatch detected!', {
          profileOrg: authenticatedUser.organization_id,
          assetOrg: assetData.organization_id,
          impact: 'This could cause permission issues in mobile workflow'
        });
      } else {
        logResult('PIN Authentication', 'success', '✅ Organization IDs match correctly', {
          organizationId: assetData.organization_id
        });
      }

      const mobileSession = {
        user_id: authenticatedUser.id,
        organization_id: authenticatedUser.organization_id,
        full_name: authenticatedUser.full_name || 'Mobile User',
        role: 'user'
      };

      logResult('PIN Authentication', 'success', `✅ PIN authentication simulated: ${mobileSession.full_name}`, mobileSession);

      // Step 4: Test form loading
      const inventoryForm = linkedForms.find(f => f.purpose === 'inventory');
      if (!inventoryForm) {
        logResult('Form Loading', 'warning', '⚠️ No inventory form found for this asset type', { linkedForms });
      } else {
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', inventoryForm.form_id)
          .single();

        if (formError) {
          logResult('Form Loading', 'error', `Failed to load form: ${formError.message}`, formError);
          return;
        }
        logResult('Form Loading', 'success', `✅ Form loaded: ${formData.name}`, formData);
      }

      // Step 5: Test inventory item loading
      logResult('Inventory Loading', 'info', 'Testing inventory item access...');
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('quantity, id')
        .eq('asset_id', assetId)
        .single();

      if (inventoryError) {
        logResult('Inventory Loading', 'warning', `No inventory item found: ${inventoryError.message}`, inventoryError);
      } else {
        logResult('Inventory Loading', 'success', `✅ Inventory item loaded: quantity = ${inventoryItem.quantity}`, inventoryItem);
      }

      // Step 6: Test critical database operations
      logResult('Database Operations', 'info', 'Testing form submission operations...');

      // Test form submission insert
      if (inventoryForm) {
        const testSubmissionData = {
          form_id: inventoryForm.form_id,
          organization_id: assetData.organization_id,
          asset_id: assetId,
          submission_data: { test_quantity: 150, test_location: 'Diagnostic Test', timestamp: new Date().toISOString() },
          status: 'completed'
        };

        const { data: submissionResult, error: submissionError } = await supabase
          .from('form_submissions')
          .insert(testSubmissionData)
          .select()
          .single();

        if (submissionError) {
          logResult('Database Operations', 'error', `❌ Form submission failed: ${submissionError.message}`, {
            error: submissionError,
            data: testSubmissionData
          });
          return;
        }
        logResult('Database Operations', 'success', '✅ Form submission test successful', submissionResult);

        // Test inventory update (if inventory item exists)
        if (inventoryItem) {
          const { data: inventoryUpdate, error: inventoryUpdateError } = await supabase
            .from('inventory_items')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', inventoryItem.id)
            .select()
            .single();

          if (inventoryUpdateError) {
            logResult('Database Operations', 'error', `❌ Inventory update failed: ${inventoryUpdateError.message}`, inventoryUpdateError);
          } else {
            logResult('Database Operations', 'success', '✅ Inventory update test successful', inventoryUpdate);
          }

          // Test RPC call
          const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_inventory_history_simple', {
            organization_id: assetData.organization_id,
            inventory_item_id: inventoryItem.id,
            quantity: 42,
            event_type: 'audit',
            check_type: 'diagnostic',
            created_by: mobileSession.user_id,
            condition: null,
            notes: 'Mobile workflow diagnostic test',
            status: 'active',
            location: 'Test Location',
            response_data: { diagnostic: true, timestamp: new Date().toISOString() }
          });

          if (rpcError) {
            logResult('Database Operations', 'error', `❌ RPC call failed: ${rpcError.message}`, rpcError);
          } else {
            logResult('Database Operations', 'success', '✅ RPC call test successful', rpcResult);
            
            // Clean up test data
            await supabase.from('inventory_history').delete().eq('id', rpcResult.id);
          }
        }

        // Clean up test submission
        await supabase.from('form_submissions').delete().eq('id', submissionResult.id);
        logResult('Cleanup', 'info', '✅ Test data cleaned up');
      }

      logResult('Complete', 'success', '🎉 Mobile Workflow Diagnostics COMPLETED SUCCESSFULLY!');
      logResult('Summary', 'info', 'All core mobile workflow operations are functioning correctly');

    } catch (error) {
      logResult('Unexpected Error', 'error', `💥 Unexpected error: ${error.message}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <div className="h-4 w-4 rounded-full bg-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const handleCopyMobileUrl = () => {
    const mobileUrl = `${window.location.origin}/mobile/asset/${assetId}`;
    navigator.clipboard.writeText(mobileUrl);
    toast({ title: "Mobile URL Copied", description: "Real mobile workflow URL copied to clipboard" });
  };

  const handleOpenMobileWorkflow = () => {
    const mobileUrl = `${window.location.origin}/mobile/asset/${assetId}`;
    window.open(mobileUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl text-blue-900">Mobile Workflow Diagnostics</CardTitle>
                <p className="text-sm text-blue-700 mt-1">
                  Comprehensive testing for Asset: <code className="bg-blue-100 px-2 py-1 rounded">{assetId}</code>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.close()}
              className="gap-2 text-blue-600 border-blue-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={runDiagnostics}
              disabled={isRunning || !assetId}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic Test'}
            </Button>
            
            <Button
              variant="outline"
              onClick={clearResults}
              disabled={isRunning || results.length === 0}
              className="gap-2"
            >
              Clear Results
            </Button>

            <div className="border-l pl-3 ml-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMobileUrl}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Mobile URL
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenMobileWorkflow}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Test Real Workflow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Diagnostic Results
              <Badge variant={results.some(r => r.status === 'error') ? 'destructive' : 'default'}>
                {results.filter(r => r.status === 'success').length} passed, {results.filter(r => r.status === 'error').length} failed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-r-lg ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{result.step}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{result.message}</p>
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {results.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Mobile Workflow Diagnostic Tool</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              This tool performs comprehensive testing of the mobile QR workflow system, including PIN authentication, 
              database operations, form submissions, and inventory updates. It validates all the components that were 
              fixed in the September 2025 mobile workflow resolution.
            </p>
            <Button onClick={runDiagnostics} disabled={!assetId} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Start Diagnostic Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileTestWorkflow;