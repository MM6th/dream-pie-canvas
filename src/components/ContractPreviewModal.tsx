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
  // Podcast guest agreement fields
  host_name?: string;
  guest_name?: string;
  episode_title?: string;
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
      if (contract.signed_at) {
        doc.text('SIGNED CONTRACT DOCUMENT', 20, 45);
      } else {
        doc.text('CONTRACT PREVIEW', 20, 45);
      }
      
      // Contract details
      doc.setFontSize(12);
      doc.text(`Contract ID: ${contract.id}`, 20, 65);
      doc.text(`Contract Type: ${contract.contract_type.replace(/_/g, ' ').toUpperCase()}`, 20, 75);
      
      // Handle podcast guest agreement differently
      if (contract.contract_type === 'podcast_guest_agreement') {
        doc.text(`Host: ${contract.host_name || 'N/A'}`, 20, 85);
        doc.text(`Guest: ${contract.guest_name || contract.merchant_name || 'N/A'}`, 20, 95);
        doc.text(`Episode: ${contract.episode_title || contract.audio_product_title || 'N/A'}`, 20, 105);
        doc.text(`Signed Date: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : 'Pending'}`, 20, 115);
        doc.text(`Guest Signature: ${contract.merchant_signature || 'Pending'}`, 20, 125);
        if (contract.admin_signature) {
          doc.text(`Host Signature: ${contract.admin_signature}`, 20, 135);
        }

        // Revenue breakdown for podcast agreements
        doc.setFontSize(14);
        doc.text('REVENUE SPLIT BREAKDOWN:', 20, 155);
        doc.setFontSize(10);
        
        const podcastBreakdown = [
          '',
          '50/50 REVENUE SPLIT AGREEMENT:',
          '',
          '• PayPal Processing Fee: ~3% (deducted first)',
          '• PIE Platform Fee: 10% (of remaining amount)',
          '• Host Share: 50% (of remaining)',
          '• Guest Share: 50% (of remaining)',
          '',
          'EXAMPLE CALCULATION ($5.00 Episode):',
          '• PayPal Fee (~3%): -$0.15',
          '• Subtotal after PayPal: $4.85',
          '• PIE Platform (10%): -$0.49',
          '• Remaining for Split: $4.36',
          '• Host Receives: $2.18 (50%)',
          '• Guest Receives: $2.18 (50%)',
          '',
          'PAYMENT TERMS:',
          '• Revenue distributed monthly',
          '• Minimum payout threshold: $50.00',
          '• Payments via PayPal',
          '',
        ];
        
        let yPosition = 165;
        podcastBreakdown.forEach(line => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 10;
        });
        
        // Contract terms
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        } else {
          yPosition += 10;
        }
        
        doc.setFontSize(12);
        doc.text('FULL CONTRACT TERMS:', 20, yPosition);
        yPosition += 15;
        doc.setFontSize(9);
        
        const splitTerms = doc.splitTextToSize(contract.contract_terms, 170);
        splitTerms.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 8;
        });
      } else {
        doc.text(`Merchant: ${contract.merchant_name}`, 20, 85);
        doc.text(`Product: ${contract.audio_product_title}`, 20, 95);
        doc.text(`Signed Date: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : 'Pending'}`, 20, 105);
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
          // For other contracts, just show the terms
          doc.text('CONTRACT TERMS:', 20, 135);
          doc.setFontSize(10);
          
          // Split contract terms into lines that fit the page
          const splitTerms = doc.splitTextToSize(contract.contract_terms, 170);
          doc.text(splitTerms, 20, 145);
        }
      }
      
      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Generated on ${new Date().toLocaleDateString()} by PIE Platform - Page ${i} of ${pageCount}`, 20, 285);
      }
      
      // Download the PDF
      const fileName = contract.contract_type === 'podcast_guest_agreement'
        ? `PIE_Podcast_Agreement_${contract.id}_${contract.episode_title?.replace(/\s+/g, '_') || 'episode'}.pdf`
        : `PIE_Contract_${contract.id}_${contract.merchant_name?.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      
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
            Contract Preview - {contract.contract_type === 'podcast_guest_agreement' 
              ? contract.episode_title || 'Podcast Agreement'
              : contract.audio_product_title}
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
                  <p><strong>Type:</strong> {contract.contract_type.replace(/_/g, ' ').toUpperCase()}</p>
                  <p><strong>Status:</strong> {contract.status}</p>
                </div>
                <div>
                  {contract.contract_type === 'podcast_guest_agreement' ? (
                    <>
                      <p><strong>Host:</strong> {contract.host_name || 'N/A'}</p>
                      <p><strong>Guest:</strong> {contract.guest_name || contract.merchant_name}</p>
                      <p><strong>Episode:</strong> {contract.episode_title || contract.audio_product_title}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Merchant:</strong> {contract.merchant_name}</p>
                      <p><strong>Product:</strong> {contract.audio_product_title}</p>
                    </>
                  )}
                  <p><strong>Signed:</strong> {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : 'Not signed'}</p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Signatures</h3>
              <div className="space-y-2 text-sm">
                {contract.contract_type === 'podcast_guest_agreement' ? (
                  <>
                    <p><strong>Guest Signature:</strong> {contract.merchant_signature || 'Pending'}</p>
                    <p><strong>Host Signature:</strong> {contract.admin_signature || 'Pending'}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Merchant Signature:</strong> {contract.merchant_signature}</p>
                    {contract.admin_signature && (
                      <p><strong>Admin Signature:</strong> {contract.admin_signature}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Revenue Breakdown for Podcast Guest Agreements */}
            {contract.contract_type === 'podcast_guest_agreement' && (
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">50/50 Revenue Split</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-white">Revenue Distribution:</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>PayPal Processing: ~3% (deducted first)</li>
                      <li>PIE Platform Fee: 10% (of remaining)</li>
                      <li>Host Share: 50% (of remaining)</li>
                      <li>Guest Share: 50% (of remaining)</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-gray-600/50 rounded-lg">
                    <h4 className="font-semibold text-white">Example ($5 Episode):</h4>
                    <ul className="text-xs mt-1 space-y-0.5">
                      <li>PayPal Fee: -$0.15</li>
                      <li>PIE Platform: -$0.49</li>
                      <li>Host: $2.18</li>
                      <li>Guest: $2.18</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

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