import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface SignedContract {
  id: string;
  merchant_id: string;
  contract_type: string;
  contract_terms: string;
  merchant_signature: string;
  signed_at: string;
  cover_submission_id?: string;
  modeling_application_id?: string;
  merchant_name?: string;
  audio_product_title?: string;
  submission_type?: string;
}

const SignedContractsSection = () => {
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignedContracts = async () => {
    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('status', 'signed')
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

          let submissionData = null;
          let submissionType = '';

          // Get submission details based on contract type
          if (contract.cover_submission_id) {
            const { data } = await supabase
              .from('song_cover_submissions')
              .select(`
                *,
                audio_products (title)
              `)
              .eq('id', contract.cover_submission_id)
              .single();
            
            submissionData = data;
            submissionType = 'Cover Submission';
          } else if (contract.modeling_application_id) {
            const { data } = await supabase
              .from('modeling_applications')
              .select(`
                *,
                fashion_products (title)
              `)
              .eq('id', contract.modeling_application_id)
              .single();
            
            submissionData = data;
            submissionType = 'Modeling Application';
          }

          return {
            ...contract,
            merchant_name: merchantData?.display_name || 'Unknown Merchant',
            audio_product_title: submissionData?.audio_products?.title || submissionData?.fashion_products?.title || 'Unknown Product',
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

  useEffect(() => {
    fetchSignedContracts();
  }, []);

  const generateContractPDF = (contract: SignedContract) => {
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
      
      // Contract terms
      doc.text('CONTRACT TERMS:', 20, 135);
      doc.setFontSize(10);
      
      // Split contract terms into lines that fit the page
      const splitTerms = doc.splitTextToSize(contract.contract_terms, 170);
      doc.text(splitTerms, 20, 145);
      
      // Footer
      doc.setFontSize(8);
      doc.text(`Generated on ${new Date().toLocaleDateString()} by PIE Admin Dashboard`, 20, 280);
      
      // Download the PDF
      doc.save(`PIE_Contract_${contract.id}_${contract.merchant_name.replace(/\s+/g, '_')}.pdf`);
      
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
                      <Badge className="bg-green-600 text-white">
                        Signed
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
                      onClick={() => generateContractPDF(contract)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download PDF
                    </Button>
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
  );
};

export default SignedContractsSection;