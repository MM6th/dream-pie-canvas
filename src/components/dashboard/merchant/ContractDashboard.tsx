
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import TuneCoreContractModal from "@/components/TuneCoreContractModal";

interface ContractWithDetails {
  id: string;
  contract_type: string;
  status: string;
  created_at: string;
  merchant_signed_at: string | null;
  admin_signed_at: string | null;
  contract_terms: string;
  cover_submission_id: string | null;
  modeling_application_id: string | null;
  tunecore_publishing_date: string | null;
  email_notifications_sent: boolean | null;
  submission_title?: string;
}

const ContractDashboard = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);

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
            const { data: coverData } = await supabase
              .from('song_cover_submissions')
              .select(`
                audio_product_id,
                audio_products (title)
              `)
              .eq('id', contract.cover_submission_id)
              .single();

            if (coverData?.audio_products) {
              submission_title = `Audio Cover: ${coverData.audio_products.title}`;
            }
          } else if (contract.modeling_application_id) {
            const { data: modelingData } = await supabase
              .from('modeling_applications')
              .select(`
                fashion_product_id,
                fashion_products (title)
              `)
              .eq('id', contract.modeling_application_id)
              .single();

            if (modelingData?.fashion_products) {
              submission_title = `Modeling: ${modelingData.fashion_products.title}`;
            }
          }

          return {
            ...contract,
            submission_title
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'signed':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
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
      case 'completed':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusDescription = (contract: ContractWithDetails) => {
    switch (contract.status) {
      case 'pending':
        return 'Awaiting your signature';
      case 'signed':
        return 'Awaiting admin approval and TuneCore processing';
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
            TuneCore Publishing Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Contracts Yet</h4>
              <p className="text-gray-400">
                Contracts will appear here once your submissions are approved for TuneCore publishing.
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
                        {contract.merchant_signed_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Signed: {new Date(contract.merchant_signed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {contract.tunecore_publishing_date && (
                        <p className="text-green-400 text-sm mt-2">
                          TuneCore Publishing Date: {new Date(contract.tunecore_publishing_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {contract.status === 'pending' && (
                      <Button
                        onClick={() => handleSignContract(contract)}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        Sign Contract
                      </Button>
                    )}
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
    </>
  );
};

export default ContractDashboard;
