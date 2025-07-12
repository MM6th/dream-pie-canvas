
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, Clock, AlertCircle, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import TuneCoreContractModal from "@/components/TuneCoreContractModal";
import ContractPreviewModal from "@/components/ContractPreviewModal";
import jsPDF from 'jspdf';

interface ContractWithDetails {
  id: string;
  contract_type: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  contract_terms: string;
  cover_submission_id: string | null;
  modeling_application_id: string | null;
  merchant_signature: string | null;
  admin_signature: string | null;
  merchant_id: string;
  tunecore_terms_accepted: boolean | null;
  updated_at: string;
  submission_title?: string;
  merchant_name?: string;
  audio_product_title?: string;
}

const ContractDashboard = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich contracts with submission details
      const enrichedContracts = await Promise.all(
        (data || []).map(async (contract) => {
          let submission_title = 'Unknown Submission';

          if (contract.cover_submission_id) {
            // First get the submission
            const { data: coverData } = await supabase
              .from('song_cover_submissions')
              .select('audio_product_id')
              .eq('id', contract.cover_submission_id)
              .single();

            if (coverData?.audio_product_id) {
              // Then get the audio product
              const { data: audioData } = await supabase
                .from('audio_products')
                .select('title')
                .eq('id', coverData.audio_product_id)
                .single();

              if (audioData?.title) {
                submission_title = `PIE Audio Cover: ${audioData.title}`;
              }
            }
          } else if (contract.modeling_application_id) {
            // First get the modeling application
            const { data: modelingData } = await supabase
              .from('modeling_applications')
              .select('fashion_product_id')
              .eq('id', contract.modeling_application_id)
              .single();

            if (modelingData?.fashion_product_id) {
              // Then get the fashion product
              const { data: fashionData } = await supabase
                .from('fashion_products')
                .select('title')
                .eq('id', modelingData.fashion_product_id)
                .single();

              if (fashionData?.title) {
                submission_title = `PIE Modeling: ${fashionData.title}`;
              }
            }
          } else if (contract.contract_type === 'podcast_opportunity') {
            // For podcast opportunities, get the audio product from podcast_downloads
            const { data: podcastDownload } = await supabase
              .from('podcast_downloads')
              .select('audio_product_id')
              .eq('contract_id', contract.id)
              .single();

            if (podcastDownload?.audio_product_id) {
              const { data: audioData } = await supabase
                .from('audio_products')
                .select('title')
                .eq('id', podcastDownload.audio_product_id)
                .single();

              if (audioData?.title) {
                submission_title = `PIE Podcast Opportunity: ${audioData.title}`;
              }
            }
          }

          // Get merchant name for all contracts
          const { data: merchantData } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name, business_name')
            .eq('id', contract.merchant_id)
            .single();

          const merchantName = merchantData?.display_name || 
                               merchantData?.business_name || 
                               `${merchantData?.first_name || ''} ${merchantData?.last_name || ''}`.trim() || 
                               'Unknown Merchant';

          return {
            ...contract,
            submission_title,
            merchant_name: merchantName,
            audio_product_title: submission_title
          };
        })
      );

      setContracts(enrichedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user]);

  const handleSignContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setShowContractModal(true);
  };

  const handleViewContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'signed':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'signed':
        return 'bg-blue-600';
      case 'approved':
        return 'bg-green-600';
      case 'completed':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusDescription = (contract: ContractWithDetails) => {
    if (contract.contract_type === 'podcast_opportunity') {
      switch (contract.status) {
        case 'pending':
          return 'Contract available for signing';
        case 'signed':
          return 'Contract signed - YouTube/PIE partnership active';
        case 'available':
          return 'Contract available for signing';
        default:
          return 'Unknown status';
      }
    }
    
    switch (contract.status) {
      case 'pending':
        return 'Awaiting your signature';
      case 'signed':
        return 'Awaiting admin approval and TuneCore processing';
      case 'approved':
        return 'Contract approved - Product now available for purchase';
      case 'completed':
        return 'Contract completed - TuneCore publishing active';
      default:
        return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <p className="text-gray-400">Loading contracts...</p>
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
            Contract Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Contracts Yet</h4>
              <p className="text-gray-400">
                Contracts will appear here for approved submissions and podcast opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-medium">
                          {contract.submission_title}
                        </h4>
                        <Badge className={`${getStatusColor(contract.status)} text-white`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(contract.status)}
                            {contract.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        {getStatusDescription(contract)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created: {new Date(contract.created_at).toLocaleDateString()}
                        </span>
                        {contract.signed_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Signed: {new Date(contract.signed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {contract.status === 'pending' && (
                        <Button
                          onClick={() => handleSignContract(contract)}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          Sign Contract
                        </Button>
                      )}
                      {(contract.status === 'signed' || contract.status === 'approved') && contract.signed_at && (
                        <>
                          <Button
                            onClick={() => handleViewContract(contract)}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Contract
                          </Button>
                          {contract.status === 'approved' && (
                            <Button
                              onClick={() => {
                                const doc = new jsPDF();
                                doc.text(`Contract: ${contract.submission_title}`, 20, 20);
                                doc.text(`Status: ${contract.status}`, 20, 40);
                                doc.text(contract.contract_terms, 20, 60);
                                doc.save(`Contract_${contract.id}.pdf`);
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TuneCoreContractModal
        isOpen={showContractModal}
        onClose={() => {
          setShowContractModal(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onContractSigned={fetchContracts}
      />

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

export default ContractDashboard;
