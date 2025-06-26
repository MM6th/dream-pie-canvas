
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, DollarSign } from "lucide-react";
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
          merchant_first_name: firstName.trim(),
          merchant_last_name: lastName.trim(),
          merchant_terms_acknowledged: true,
          merchant_signed_at: new Date().toISOString(),
          merchant_signature: `${firstName.trim()} ${lastName.trim()}`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            TuneCore Publishing Agreement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* TuneCore Partnership Information */}
          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-400">TuneCore Partnership Benefits</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                Through our partnership with TuneCore, your approved submissions will be distributed across major streaming platforms including:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
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
              <div className="mt-3 p-3 bg-green-600/20 border border-green-600/30 rounded">
                <p className="text-green-400 font-medium">Revenue Sharing:</p>
                <p className="text-gray-300 text-sm">• You retain 85% of all streaming royalties</p>
                <p className="text-gray-300 text-sm">• Platform receives 15% for distribution and promotion</p>
                <p className="text-gray-300 text-sm">• No upfront costs - only pay from earned revenue</p>
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
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm text-gray-300 leading-5">
                I acknowledge that I understand what I have submitted, what I am signing up for, 
                and that I will await an email with publishing date and screenshot of my involvement from TuneCore. 
                I understand the revenue sharing terms and agree to the TuneCore partnership conditions.
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
              disabled={loading || !firstName.trim() || !lastName.trim() || !termsAccepted}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
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
