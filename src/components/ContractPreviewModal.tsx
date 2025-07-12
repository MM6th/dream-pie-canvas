import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from 'jspdf';
import { toast } from "@/hooks/use-toast";

interface Contract {
  id: string;
  merchant_id: string;
  contract_type: string;
  contract_terms: string;
  merchant_signature: string | null;
  signed_at: string;
  status: string;
  admin_signature?: string;
  cover_submission_id?: string;
  modeling_application_id?: string;
  merchant_name?: string;
  audio_product_title?: string;
  submission_type?: string;
}

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
}

const ContractPreviewModal = ({ isOpen, onClose, contract }: ContractPreviewModalProps) => {
  if (!contract) return null;

  const generateContractPDF = () => {
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

  const formatContractTerms = (terms: string) => {
    return terms.split('\n').map((line, index) => (
      <p key={index} className={line.trim() === '' ? "mb-4" : "mb-2"}>
        {line}
      </p>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-800 border-gray-700">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white text-xl">
            Contract Preview - {contract.audio_product_title}
          </DialogTitle>
          <Button
            onClick={generateContractPDF}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-gray-300">
            {/* Contract Header Info */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Contract Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Contract ID:</strong> {contract.id}</p>
                  <p><strong>Type:</strong> {contract.contract_type.replace('_', ' ').toUpperCase()}</p>
                  <p><strong>Status:</strong> {contract.status}</p>
                </div>
                <div>
                  <p><strong>Merchant:</strong> {contract.merchant_name}</p>
                  <p><strong>Product:</strong> {contract.audio_product_title}</p>
                  <p><strong>Signed:</strong> {new Date(contract.signed_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Signatures</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Merchant Signature:</strong> {contract.merchant_signature}</p>
                {contract.admin_signature && (
                  <p><strong>Admin Signature:</strong> {contract.admin_signature}</p>
                )}
              </div>
            </div>

            {/* Revenue Breakdown for Cover Submissions */}
            {contract.contract_type === 'cover_submission' && (
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Revenue Distribution Breakdown</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-white">PIE Platform Exclusive Distribution:</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>PIE Platform: 30% (after PayPal processing fees)</li>
                      <li>Main Artist: 70% of remaining revenue</li>
                      <li>Cover Model (Merchant): 21% of total revenue</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">TuneCore Widespread Distribution:</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>TuneCore Distribution Fee: 15%</li>
                      <li>Main Artist: 70.5% of total revenue</li>
                      <li>Cover Model (Merchant): 14.5% of total revenue</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Terms */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Full Contract Terms</h3>
              <div className="text-sm whitespace-pre-wrap">
                {formatContractTerms(contract.contract_terms)}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContractPreviewModal;