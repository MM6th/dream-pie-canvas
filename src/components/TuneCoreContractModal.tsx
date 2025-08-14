import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText } from "lucide-react";
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
        description: "Please accept the terms and conditions to proceed",
        variant: "destructive"
      });
      return;
    }

    if (!contract) {
      toast({
        title: "Error",
        description: "No contract data available",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: 'signed',
          merchant_signature: `${firstName.trim()} ${lastName.trim()}`,
          signed_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: "Contract Signed Successfully",
        description: "Your contract has been signed and recorded.",
      });

      onContractSigned();
      onClose();
      setFirstName("");
      setLastName("");
      setTermsAccepted(false);
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error Signing Contract",
        description: "There was an error signing your contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!contract) return null;

  // Form validation
  const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0 && termsAccepted;
  console.log('Form validation debug:', { 
    firstName: firstName.trim(), 
    lastName: lastName.trim(), 
    termsAccepted, 
    isFormValid 
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            Contract Agreement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display the actual contract terms from the database */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contract Terms</h3>
            <div className="whitespace-pre-line text-sm text-gray-200 leading-relaxed max-h-96 overflow-y-auto">
              {contract.contract_terms}
            </div>
          </div>

          {/* Digital Signature Section */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Digital Signature
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 mb-6">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="border-gray-600 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed">
                I hereby agree to the terms and conditions outlined in this contract. 
                By checking this box and providing my digital signature below, I acknowledge that I have read, 
                understood, and agree to be bound by all terms of this agreement.
              </Label>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitContract}
                disabled={!isFormValid || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
              >
                {loading ? "Signing..." : "Sign Contract"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TuneCoreContractModal;