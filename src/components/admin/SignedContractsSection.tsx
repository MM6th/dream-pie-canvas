import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContractPreviewModal from "@/components/ContractPreviewModal";
import jsPDF from 'jspdf';

interface SignedContract {
  id: string;
  merchant_id: string;
  contract_type: string;
  contract_terms: string;
  merchant_signature: string;
  signed_at: string;
  status: string;
  admin_signature?: string;
  cover_submission_id?: string;
  modeling_application_id?: string;
  merchant_name?: string;
  audio_product_title?: string;
  submission_type?: string;
}

const SignedContractsSection = () => {
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<SignedContract | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchSignedContracts = async () => {
    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .in('status', ['signed', 'approved'])
        .order('signed_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Enrich contracts with merchant and submission data
      const enrichedContracts = await Promise.all(
        (contractsData || []).map(async (contract) => {
          // Get merchant name
          const { data: merchantData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', contract.merchant_id)
            .single();

          let productTitle = 'Unknown Product';
          let submissionType = '';

          // Get submission details based on contract type
          if (contract.cover_submission_id) {
            const { data } = await supabase
              .from('song_cover_submissions')
              .select('audio_product_id')
              .eq('id', contract.cover_submission_id)
              .single();
            
            if (data?.audio_product_id) {
              const { data: audioData } = await supabase
                .from('audio_products')
                .select('title')
                .eq('id', data.audio_product_id)
                .single();
              
              productTitle = audioData?.title || 'Unknown Product';
            }
            
            submissionType = 'Cover Submission';
          } else if (contract.modeling_application_id) {
            const { data } = await supabase
              .from('modeling_applications')
              .select('fashion_product_id')
              .eq('id', contract.modeling_application_id)
              .single();
            
            if (data?.fashion_product_id) {
              const { data: fashionData } = await supabase
                .from('fashion_products')
                .select('title')
                .eq('id', data.fashion_product_id)
                .single();
              
              productTitle = fashionData?.title || 'Unknown Product';
            }
            
            submissionType = 'Modeling Application';
          }

          return {
            ...contract,
            merchant_name: merchantData?.display_name || 'Unknown Merchant',
            audio_product_title: productTitle,
            submission_type: submissionType
          };
        })
      );

      setContracts(enrichedContracts);
    } catch (error) {
      console.error('Error fetching signed contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load signed contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: 'approved',
          admin_signature: (await supabase.auth.getUser()).data.user?.email || 'Admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract approved successfully"
      });

      fetchSignedContracts();
    } catch (error) {
      console.error('Error approving contract:', error);
      toast({
        title: "Error",
        description: "Failed to approve contract",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSignedContracts();
  }, []);

  const handleViewContract = (contract: SignedContract) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const handleDownloadContract = (contract: SignedContract) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('PRIVATE INVESTIGATION ENTERPRISES', 20, 30);
      doc.setFontSize(16);
      doc.text('SIGNED CONTRACT DOCUMENT', 20, 45);
      
      // Contract details
      doc.setFontSize(12);
      doc.text(`Contract ID: ${contract.id}`, 20, 65);
      doc.text(`Contract Type: ${contract.contract_type.replace('_', ' ').toUpperCase()}`, 20, 75);
      doc.text(`Merchant: ${contract.merchant_name}`, 20, 85);
      doc.text(`Product: ${contract.audio_product_title}`, 20, 95);
      doc.text(`Signed Date: ${new Date(contract.signed_at).toLocaleDateString()}`, 20, 105);
      doc.text(`Merchant Signature: ${contract.merchant_signature}`, 20, 115);
      if (contract.admin_signature) {
        doc.text(`Admin Signature: ${contract.admin_signature}`, 20, 125);
      }
      
      // Add detailed royalty breakdown section for cover submission contracts
      if (contract.contract_type === 'cover_submission') {
        doc.setFontSize(14);
        doc.text('REVENUE DISTRIBUTION BREAKDOWN:', 20, 135);
        doc.setFontSize(10);
        
        const royaltyBreakdown = [
          'PIE PLATFORM EXCLUSIVE DISTRIBUTION:',
          '',
          '• PIE Platform: 30% (after PayPal processing fees)',
          '  - Platform hosting, processing, and exclusive early access',
          '  - Premium pricing with $2.00 minimum for exclusivity',
          '',
          '• Main Artist: 70% of remaining revenue',
          '  - Retains full ownership and publishing rights',
          '  - Direct relationship with PIE platform supporters',
          '',
          '• Cover Model (Merchant): 21% of total revenue',
          '  - Receives 30% of Main Artist\'s 70% share',
          '  - Compensation for cover art modeling and promotional value',
          '',
          'PIE PLATFORM EXAMPLE (per $2.00 purchase):',
          '• PIE Platform: $0.60 (30% after processing)',
          '• Main Artist: $1.40 (70% of total)',
          '• Cover Model: $0.42 (21% of total)',
          '',
          'TUNECORE WIDESPREAD DISTRIBUTION:',
          '',
          '• TuneCore Distribution Fee: 15%',
          '  - Global distribution to 150+ stores and streaming platforms',
          '  - Monthly reporting and royalty collection services',
          '',
          '• Main Artist: 70.5% of total revenue',
          '  - Receives 85% of revenue remaining after TuneCore fees',
          '  - Maintains full ownership and publishing rights',
          '',
          '• Cover Model (Merchant): 14.5% of total revenue',
          '  - Receives 20% of Main Artist\'s 85% revenue share',
          '  - Lower percentage due to widespread distribution model',
          '',
          'TUNECORE EXAMPLE (per $1.29 purchase/stream):',
          '• TuneCore Fee: $0.19 (15% of $1.29)',
          '• Main Artist: $0.91 (70.5% of total)',
          '• Cover Model: $0.19 (14.5% of total)',
          '',
          'DISTRIBUTION STRATEGY:',
          '• Tracks are first released exclusively on PIE platform',
          '• After exclusivity period, distributed via TuneCore globally',
          '• Different revenue structures reflect platform differences',
          '',
        ];
      
        let yPosition = 145;
        royaltyBreakdown.forEach(line => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 12;
        });
        
        // Contract terms on new page or continued
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        } else {
          yPosition += 10;
        }
        
        doc.setFontSize(12);
        doc.text('FULL CONTRACT TERMS:', 20, yPosition);
        yPosition += 15;
        doc.setFontSize(10);
        
        // Split contract terms into lines that fit the page
        const splitTerms = doc.splitTextToSize(contract.contract_terms, 170);
        splitTerms.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 12;
        });
      } else {
        // For non-cover submission contracts, just show the terms
        doc.text('CONTRACT TERMS:', 20, 135);
        doc.setFontSize(10);
        
        // Split contract terms into lines that fit the page
        const splitTerms = doc.splitTextToSize(contract.contract_terms, 170);
        doc.text(splitTerms, 20, 145);
      }
      
      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Generated on ${new Date().toLocaleDateString()} by PIE Admin Dashboard - Page ${i} of ${pageCount}`, 20, 285);
      }
      
      // Download the PDF
      doc.save(`PIE_Contract_${contract.id}_${contract.merchant_name?.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "Success",
        description: "Contract PDF downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate contract PDF",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <p className="text-gray-400">Loading signed contracts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            Signed Contracts ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Signed Contracts</h4>
              <p className="text-gray-400">Signed contracts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-2">
                         <h4 className="text-white font-medium">
                           {contract.audio_product_title}
                         </h4>
                         <Badge className={contract.status === 'approved' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}>
                           {contract.status === 'approved' ? 'Approved' : 'Awaiting Approval'}
                         </Badge>
                         <Badge className="bg-blue-600 text-white">
                           {contract.submission_type}
                         </Badge>
                       </div>
                      
                      <div className="space-y-1 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>Merchant: {contract.merchant_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>Signed: {new Date(contract.signed_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>Signature: {contract.merchant_signature}</span>
                        </div>
                      </div>
                    </div>
                    
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleViewContract(contract)}
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Contract
                        </Button>
                        <Button
                          onClick={() => handleDownloadContract(contract)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download PDF
                        </Button>
                        {contract.status === 'signed' && (
                          <Button
                            onClick={() => handleApproveContract(contract.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-gray-600/30 rounded text-xs text-gray-400">
                    <p><strong>Contract ID:</strong> {contract.id}</p>
                    <p><strong>Type:</strong> {contract.contract_type.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContractPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
      />
    </>
  );
};

export default SignedContractsSection;