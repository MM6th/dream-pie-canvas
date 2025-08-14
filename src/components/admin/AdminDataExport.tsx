import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminDataExport = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportApprovedSignedData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Get all approved submissions with signed contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('status', 'signed');

      if (contractsError) throw contractsError;

      const exportData = {
        export_date: new Date().toISOString(),
        total_contracts: contracts.length,
        song_cover_submissions: [],
        modeling_applications: [],
        video_ad_submissions: [],
        asmr_submissions: [],
        merchant_profiles: []
      };

      // Process each contract and get related submission data
      for (const contract of contracts) {
        // Get merchant profile data
        const { data: merchantProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', contract.merchant_id)
          .single();

        if (merchantProfile) {
          // Add merchant to array if not already included
          const existingMerchant = exportData.merchant_profiles.find(m => m.id === merchantProfile.id);
          if (!existingMerchant) {
            exportData.merchant_profiles.push({
              ...merchantProfile,
              contract_count: contracts.filter(c => c.merchant_id === merchantProfile.id).length
            });
          }
        }

        // Get submission data based on contract type
        if (contract.cover_submission_id) {
          const { data: submission } = await supabase
            .from('song_cover_submissions')
            .select(`
              *,
              audio_products (
                title,
                artist_name,
                audio_type,
                thumbnail_url,
                audio_file_url
              )
            `)
            .eq('id', contract.cover_submission_id)
            .eq('status', 'approved')
            .single();

          if (submission) {
            exportData.song_cover_submissions.push({
              ...submission,
              contract_id: contract.id,
              signed_at: contract.signed_at,
              merchant_profile: merchantProfile
            });
          }
        }

        if (contract.modeling_application_id) {
          const { data: submission } = await supabase
            .from('modeling_applications')
            .select(`
              *,
              fashion_products (
                title,
                description,
                price
              )
            `)
            .eq('id', contract.modeling_application_id)
            .eq('status', 'approved')
            .single();

          if (submission) {
            exportData.modeling_applications.push({
              ...submission,
              contract_id: contract.id,
              signed_at: contract.signed_at,
              merchant_profile: merchantProfile
            });
          }
        }

        if (contract.video_ad_submission_id) {
          const { data: submission } = await supabase
            .from('video_ad_submissions')
            .select(`
              *,
              video_ad_opportunities (
                title,
                description,
                payment_amount,
                target_platform,
                audio_type
              )
            `)
            .eq('id', contract.video_ad_submission_id)
            .eq('status', 'approved')
            .single();

          if (submission) {
            exportData.video_ad_submissions.push({
              ...submission,
              contract_id: contract.id,
              signed_at: contract.signed_at,
              merchant_profile: merchantProfile
            });
          }
        }

        // Check for ASMR submissions
        const { data: asmrSubmissions } = await supabase
          .from('asmr_submissions')
          .select(`
            *,
            audio_products (
              title,
              artist_name,
              audio_type,
              thumbnail_url,
              audio_file_url
            )
          `)
          .eq('contract_id', contract.id)
          .eq('status', 'approved');

        if (asmrSubmissions && asmrSubmissions.length > 0) {
          exportData.asmr_submissions.push(...asmrSubmissions.map(submission => ({
            ...submission,
            contract_id: contract.id,
            signed_at: contract.signed_at,
            merchant_profile: merchantProfile
          })));
        }
      }

      // Create downloadable file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pie-approved-signed-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported data for ${exportData.total_contracts} signed contracts with approved submissions.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportContractsSummary = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Get contracts summary data
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          profiles!contracts_merchant_id_fkey (
            display_name,
            business_name,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create CSV format
      const csvHeaders = [
        'Contract ID',
        'Merchant Name',
        'Merchant Email',
        'Contract Type',
        'Status',
        'Created Date',
        'Signed Date',
        'Submission Type'
      ];

      const csvRows = contracts.map(contract => {
        const merchant = contract.profiles;
        const merchantName = merchant?.display_name || 
                            merchant?.business_name || 
                            `${merchant?.first_name || ''} ${merchant?.last_name || ''}`.trim() || 
                            'Unknown';
        
        return [
          contract.id,
          merchantName,
          merchant?.email || '',
          contract.contract_type,
          contract.status,
          new Date(contract.created_at).toLocaleDateString(),
          contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : '',
          contract.cover_submission_id ? 'Song Cover' :
          contract.modeling_application_id ? 'Modeling' :
          contract.video_ad_submission_id ? 'Video Ad' : 'Other'
        ];
      });

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pie-contracts-summary-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported summary for ${contracts.length} contracts.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export contracts summary.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-white font-medium">Approved & Signed Data</h4>
            <p className="text-gray-400 text-sm">
              Export all submission data where contracts are signed and submissions are approved
            </p>
            <Button
              onClick={exportApprovedSignedData}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export JSON Data
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-medium">Contracts Summary</h4>
            <p className="text-gray-400 text-sm">
              Export a CSV summary of all contracts and their status
            </p>
            <Button
              onClick={exportContractsSummary}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export CSV Summary
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <h5 className="text-white text-sm font-medium mb-2">Export Information</h5>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• JSON export includes complete submission data, merchant profiles, and contract details</li>
            <li>• CSV export provides a summary view for spreadsheet analysis</li>
            <li>• Only approved submissions with signed contracts are included in the main export</li>
            <li>• Files are named with current date for easy organization</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDataExport;