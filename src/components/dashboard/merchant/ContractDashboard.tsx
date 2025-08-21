import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, Clock, AlertCircle, Eye, Download, EyeOff, ChevronLeft, ChevronRight, Video, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import TuneCoreContractModal from "@/components/TuneCoreContractModal";
import ContractPreviewModal from "@/components/ContractPreviewModal";
import { EnhancedVideoAdSubmissionModal } from "@/components/EnhancedVideoAdSubmissionModal";
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
  video_ad_opportunity_id: string | null;
  merchant_signature: string | null;
  admin_signature: string | null;
  merchant_id: string;
  tunecore_terms_accepted: boolean | null;
  updated_at: string;
  submission_title?: string;
  merchant_name?: string;
  audio_product_title?: string;
  deleted_by_merchant?: boolean;
  hasValidSubmission?: boolean;
  submissionStatus?: string | null;
}

const ContractDashboard = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenContracts, setHiddenContracts] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVideoAdModal, setShowVideoAdModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('merchant_id', user.id)
        .or('deleted_by_merchant.is.null,deleted_by_merchant.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich contracts with submission details
      const enrichedContracts = await Promise.all(
        (data || []).map(async (contract) => {
          let submission_title = 'Unknown Submission';
          let hasValidSubmission = false;
          let submissionStatus: string | null = null;

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
                hasValidSubmission = true;
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
                hasValidSubmission = true;
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
                hasValidSubmission = true;
              }
            }
          } else if (contract.contract_type === 'asmr_submission') {
            // For ASMR submission contracts, get the audio product from asmr_submissions
            const { data: asmrSubmission } = await supabase
              .from('asmr_submissions')
              .select('audio_product_id, status')
              .eq('contract_id', contract.id)
              .single();

            if (asmrSubmission?.audio_product_id) {
              const { data: audioData } = await supabase
                .from('audio_products')
                .select('title')
                .eq('id', asmrSubmission.audio_product_id)
                .single();

              if (audioData?.title) {
                submission_title = `ASMR Submission: ${audioData.title}`;
                hasValidSubmission = true;
                submissionStatus = asmrSubmission.status;
              }
            }
          } else if (contract.video_ad_submission_id) {
            // For video ad opportunity contracts, get submission details
            const { data: submissionData } = await supabase
              .from('video_ad_submissions')
              .select('*, video_ad_opportunity_id')
              .eq('id', contract.video_ad_submission_id)
              .single();

            if (submissionData?.video_ad_opportunity_id) {
              // Get the opportunity details separately
              const { data: opportunityData } = await supabase
                .from('video_ad_opportunities')
                .select('title, description, payment_amount')
                .eq('id', submissionData.video_ad_opportunity_id)
                .single();

              if (opportunityData?.title) {
                submission_title = `Video Ad Opportunity: ${opportunityData.title}`;
                hasValidSubmission = true;
              }
            }
          }

          // Get merchant name from profile - use same reliable logic as admin version
          const { data: merchantData } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name, business_name')
            .eq('id', contract.merchant_id)
            .single();

          const merchantName = merchantData?.display_name || 
                               merchantData?.business_name || 
                               `${merchantData?.first_name || ''} ${merchantData?.last_name || ''}`.trim() || 
                               'Unknown Merchant';

          // For video ad opportunity contracts, handle status based on submission
          let actualStatus = contract.status;
          if (contract.video_ad_submission_id && contract.contract_type === 'video_ad_opportunity') {
            const { data: submissionData } = await supabase
              .from('video_ad_submissions')
              .select('status')
              .eq('id', contract.video_ad_submission_id)
              .single();

            if (submissionData) {
              submissionStatus = submissionData.status;
              // Set status based on contract signing and submission approval
              if (contract.signed_at) {
                actualStatus = 'signed';
              } else if (submissionData.status === 'approved') {
                actualStatus = 'pending'; // Contract available for signing
              }
            }
          }

          // For ASMR submission contracts, handle status based on submission
          if (contract.contract_type === 'asmr_submission') {
            if (contract.signed_at) {
              actualStatus = 'signed';
            } else if (submissionStatus === 'approved') {
              actualStatus = 'pending'; // Contract available for signing
            } else if (submissionStatus === 'rejected') {
              actualStatus = 'rejected';
            }
          }

          // Debug logging for unknown submissions
          if (!hasValidSubmission) {
            console.log('Unknown submission contract:', {
              id: contract.id,
              contract_type: contract.contract_type,
              cover_submission_id: contract.cover_submission_id,
              modeling_application_id: contract.modeling_application_id,
              video_ad_opportunity_id: contract.video_ad_opportunity_id
            });
          }

          return {
            ...contract,
            status: actualStatus,
            submissionStatus,
            submission_title,
            merchant_name: merchantName,
            audio_product_title: submission_title,
            hasValidSubmission
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

  // Separate effect for loading hidden contracts to ensure user is available
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    
    const storageKey = `hiddenContracts_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    console.log('Loading hidden contracts for user:', user.id, 'stored data:', stored);
    
    if (stored) {
      try {
        const hiddenArray = JSON.parse(stored);
        setHiddenContracts(new Set(hiddenArray));
        console.log('Successfully loaded hidden contracts:', hiddenArray);
      } catch (e) {
        console.error('Failed to parse hidden contracts from localStorage:', e);
        // Clear invalid data
        localStorage.removeItem(storageKey);
      }
    } else {
      // Ensure we start with an empty set if no data
      setHiddenContracts(new Set());
    }
  }, [user?.id]);

  const handleSignContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setShowContractModal(true);
  };

  const handleViewContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const handleCreateVideoAd = async (contract: ContractWithDetails) => {
    if (!contract.video_ad_opportunity_id) return;
    
    try {
      const { data: opportunityData, error } = await supabase
        .from('video_ad_opportunities')
        .select('*')
        .eq('id', contract.video_ad_opportunity_id)
        .single();

      if (error) throw error;

      setSelectedOpportunity(opportunityData);
      setShowVideoAdModal(true);
    } catch (error) {
      console.error('Error fetching opportunity data:', error);
      toast({
        title: "Error",
        description: "Failed to load video ad opportunity data",
        variant: "destructive"
      });
    }
  };

  const handleHideContract = (contractId: string) => {
    console.log('Hiding contract:', contractId);
    setHiddenContracts(prev => {
      const newSet = new Set(prev).add(contractId);
      const hiddenArray = Array.from(newSet);
      
      // Store with user ID for proper isolation
      if (user?.id && typeof window !== 'undefined') {
        const storageKey = `hiddenContracts_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(hiddenArray));
        console.log('Updated hidden contracts in localStorage for user:', user.id, hiddenArray);
      }
      
      return newSet;
    });
    toast({
      title: "Contract Hidden",
      description: "Contract has been hidden from your dashboard.",
    });
  };

  const handleRestoreContract = (contractId: string) => {
    console.log('Restoring contract:', contractId);
    setHiddenContracts(prev => {
      const newSet = new Set(prev);
      newSet.delete(contractId);
      const hiddenArray = Array.from(newSet);
      
      // Store with user ID for proper isolation
      if (user?.id && typeof window !== 'undefined') {
        const storageKey = `hiddenContracts_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(hiddenArray));
        console.log('Updated hidden contracts in localStorage for user:', user.id, hiddenArray);
      }
      
      return newSet;
    });
    toast({
      title: "Contract Restored",
      description: "Contract has been restored to your dashboard.",
    });
  };

  const scrollLeft = () => {
    const container = document.getElementById('contracts-scroll-container');
    if (container) {
      const newPosition = Math.max(0, scrollPosition - 400);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('contracts-scroll-container');
    if (container) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const newPosition = Math.min(maxScroll, scrollPosition + 400);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'submission_pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'submission_rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'signed':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'available':
        return <Eye className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'submission_pending':
        return 'bg-orange-600';
      case 'submission_rejected':
        return 'bg-red-600';
      case 'signed':
        return 'bg-blue-600';
      case 'approved':
        return 'bg-green-600';
      case 'completed':
        return 'bg-green-600';
      case 'available':
        return 'bg-blue-600';
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
          return 'Contract signed - awaiting admin approval';
        case 'approved':
          return 'Contract approved - YouTube/PIE partnership active';
        case 'available':
          return 'Contract available for signing';
        default:
          return 'Unknown status';
      }
    }

    if (contract.contract_type === 'video_ad_opportunity') {
      switch (contract.status) {
        case 'pending':
          return 'Video approved - contract available for signing';
        case 'signed':
          return 'Contract signed - ready for work';
        case 'approved':
          return 'Contract approved - payment authorized';
        default:
          return 'Unknown status';
      }
    }

    if (contract.contract_type === 'asmr_submission') {
      switch (contract.status) {
        case 'pending':
          return 'ASMR submission approved - contract available for signing';
        case 'signed':
          return 'Contract signed - awaiting admin approval';
        case 'approved':
          return 'Contract approved - ASMR content authorized for use';
        case 'rejected':
          return 'ASMR submission was rejected';
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5" />
              Contract Opportunities
            </CardTitle>
            {contracts.length > 0 && (
              <div className="flex items-center gap-2">
                {hiddenContracts.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHidden(!showHidden)}
                    className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    {showHidden ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showHidden ? 'Hide' : 'Show'} Hidden ({hiddenContracts.size})
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={scrollLeft}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={scrollRight}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
            <div className="relative">
              <div 
                id="contracts-scroll-container"
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {(showHidden ? contracts : contracts.filter(contract => !hiddenContracts.has(contract.id))).map((contract) => {
                  const isHidden = hiddenContracts.has(contract.id);
                  return (
                    <div key={contract.id} className={`bg-gray-700/50 p-4 rounded-lg min-w-[320px] max-w-[320px] min-h-[240px] flex-shrink-0 ${isHidden ? 'opacity-60 border border-gray-600' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h4 className={`font-medium whitespace-normal break-words ${isHidden ? 'text-gray-400' : 'text-white'}`}>
                              {contract.submission_title}
                              {isHidden && <span className="text-orange-400 ml-2">(Hidden)</span>}
                            </h4>
                            <Badge className={`${getStatusColor(contract.status)} text-white shrink-0`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(contract.status)}
                                {contract.status}
                              </span>
                            </Badge>
                          </div>
                          <p className={`text-sm mb-2 whitespace-normal break-words ${isHidden ? 'text-gray-500' : 'text-gray-400'}`}>
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
                        {isHidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreContract(contract.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20 ml-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHideContract(contract.id)}
                            className="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 ml-2"
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                                      
                      <div className="flex flex-wrap gap-2">
                        {/* Only show action buttons for contracts with valid submissions */}
                        {contract.hasValidSubmission && contract.status === 'available' && (
                          <>
                            <Button
                              onClick={() => handleViewContract(contract)}
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {contract.contract_type === 'video_ad_download' && contract.video_ad_opportunity_id && (
                              <Button
                                onClick={() => handleCreateVideoAd(contract)}
                                className="bg-blue-600 hover:bg-blue-700"
                                size="sm"
                              >
                                <Video className="w-4 h-4 mr-1" />
                                Create Video Ad
                              </Button>
                            )}
                            {contract.contract_type !== 'video_ad_download' && (
                              <Button
                                onClick={() => handleSignContract(contract)}
                                className="bg-blue-600 hover:bg-blue-700"
                                size="sm"
                              >
                                Sign Contract
                              </Button>
                            )}
                          </>
                        )}

                        {/* Video ad download contracts with approved submissions should allow signing */}
                        {contract.hasValidSubmission && contract.status === 'pending' && contract.contract_type === 'video_ad_download' && (
                          <Button
                            onClick={() => handleSignContract(contract)}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            Sign Contract
                          </Button>
                        )}

                        {/* Other contract types with pending status */}
                        {contract.hasValidSubmission && (contract.status === 'pending' || contract.status === 'submission_pending') && contract.contract_type !== 'video_ad_download' && (
                          <Button
                            onClick={() => handleSignContract(contract)}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            Sign Contract
                          </Button>
                        )}
                        
                        {/* Show message for unknown submissions */}
                        {!contract.hasValidSubmission && (
                          <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                            Invalid contract - no associated submission found
                          </div>
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
                              View
                            </Button>
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
                              Download PDF
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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

      <EnhancedVideoAdSubmissionModal
        isOpen={showVideoAdModal}
        onClose={() => {
          setShowVideoAdModal(false);
          setSelectedOpportunity(null);
        }}
        onSuccess={() => {
          setShowVideoAdModal(false);
          setSelectedOpportunity(null);
          fetchContracts(); // Refresh contracts to show updated status
          toast({
            title: "Success",
            description: "Video ad submitted successfully!"
          });
        }}
        opportunity={selectedOpportunity}
      />
    </>
  );
};

export default ContractDashboard;
