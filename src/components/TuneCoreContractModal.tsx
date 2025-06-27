
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, DollarSign, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Contract {
  id: string;
  contract_terms: string;
  contract_type: string;
  cover_submission_id?: string;
  modeling_application_id?: string;
}

interface TuneCoreContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onContractSigned: () => void;
}

const TuneCoreContractModal = ({ 
  isOpen, 
  onClose, 
  contract,
  onContractSigned 
}: TuneCoreContractModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmitContract = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your first and last name",
        variant: "destructive"
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Terms Not Accepted",
        description: "Please acknowledge that you understand the terms",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          merchant_signature: `${firstName.trim()} ${lastName.trim()}`,
          signed_at: new Date().toISOString(),
          tunecore_terms_accepted: true,
          status: 'signed'
        })
        .eq('id', contract?.id);

      if (error) throw error;

      toast({
        title: "Contract Signed Successfully",
        description: "Your contract has been signed and submitted for admin approval. You will receive an email with TuneCore publishing details soon.",
      });

      onContractSigned();
      onClose();
      
      // Reset form
      setFirstName("");
      setLastName("");
      setTermsAccepted(false);
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!contract) return null;

  // Form validation with debugging
  const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0 && termsAccepted;
  console.log('Form validation:', { firstName: firstName.trim(), lastName: lastName.trim(), termsAccepted, isFormValid });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            Publishing Agreement - Revenue Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Comparison Overview */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Dual Platform Revenue Opportunity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-600/30 border border-blue-600/40 rounded p-3">
                <h4 className="text-blue-300 font-medium mb-2">🌍 TuneCore - Global Reach</h4>
                <p className="text-gray-300">Wide distribution across major streaming platforms for maximum visibility</p>
              </div>
              <div className="bg-purple-600/30 border border-purple-600/40 rounded p-3">
                <h4 className="text-purple-300 font-medium mb-2">💰 PIE Platform - Higher Revenue</h4>
                <p className="text-gray-300">Exclusive platform with better revenue sharing for direct fan connection</p>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TuneCore Partnership Information */}
            <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-blue-400">TuneCore Revenue Stream</h3>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-gray-300">
                  Global distribution across major streaming platforms:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>Spotify</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>Apple Music</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>Amazon Music</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>YouTube Music</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-700/30 border border-blue-600/40 rounded">
                  <p className="text-blue-300 font-medium mb-2">TuneCore Revenue Share:</p>
                  <div className="text-gray-300 space-y-1">
                    <p>• TuneCore: 15% distribution fee</p>
                    <p>• PIE (original): 85% of streaming revenue</p>
                    <p>• <strong>Cover artist (you): 17% of total</strong></p>
                    <p className="text-blue-400 font-medium mt-2">Example: $1.29 song sale</p>
                    <p>• You receive: <strong>$0.22</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* PIE Platform Information */}
            <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-purple-400">PIE Platform Revenue Stream</h3>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-gray-300">
                  Direct sales through PIE's exclusive platform:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                    <span>PIE Website Store</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                    <span>Direct Fan Purchases</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                    <span>Exclusive Content Access</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-purple-700/30 border border-purple-600/40 rounded">
                  <p className="text-purple-300 font-medium mb-2">PIE Revenue Share:</p>
                  <div className="text-gray-300 space-y-1">
                    <p>• PayPal processing: ~2.9% fee</p>
                    <p>• PIE: 100% of net revenue</p>
                    <p>• <strong>Cover artist (you): 20% of PIE's share</strong></p>
                    <p className="text-purple-400 font-medium mt-2">Example: $1.29 song sale</p>
                    <p>• Net after PayPal: $1.25</p>
                    <p>• You receive: <strong>$0.25</strong></p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Comparison Summary */}
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-3">💡 Why Both Platforms Work Together</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="text-blue-400 font-medium mb-1">TuneCore Benefits:</h4>
                <p>Maximum exposure, algorithmic discovery, global streaming reach</p>
              </div>
              <div>
                <h4 className="text-purple-400 font-medium mb-1">PIE Benefits:</h4>
                <p>Higher revenue per sale, direct fan relationship, exclusive content</p>
              </div>
            </div>
          </div>

          {/* Contract Terms */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Contract Terms</h3>
            <div className="bg-gray-700/50 p-4 rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {contract.contract_terms}
              </pre>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Signature Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Digital Signature</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    console.log('First name updated:', e.target.value);
                  }}
                  className={`bg-gray-700 border-gray-600 text-white ${
                    firstName.trim().length > 0 ? 'border-green-500' : ''
                  }`}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    console.log('Last name updated:', e.target.value);
                  }}
                  className={`bg-gray-700 border-gray-600 text-white ${
                    lastName.trim().length > 0 ? 'border-green-500' : ''
                  }`}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  setTermsAccepted(checked as boolean);
                  console.log('Terms accepted updated:', checked);
                }}
              />
              <Label htmlFor="terms" className="text-sm text-gray-300 leading-5">
                I acknowledge that I understand both revenue sharing agreements: I will receive 20% of PIE's platform royalties 
                and 17% of TuneCore streaming revenue. I understand that both platforms offer different benefits - TuneCore for 
                global visibility and PIE for higher revenue sharing. I agree to await emails with publishing details from both platforms 
                and understand these partnership conditions.
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitContract}
              disabled={loading || !isFormValid}
              className={`flex-1 transition-all duration-200 ${
                isFormValid && !loading
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? "Signing..." : "Sign Contract"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TuneCoreContractModal;
