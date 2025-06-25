
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, XCircle, Download, FileText, Calendar } from "lucide-react";

interface CoverSubmission {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  cover_image_url: string;
  status: string;
  submission_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contract_id: string | null;
  requires_contract: boolean | null;
  contract_generated_at: string | null;
  audio_product_title?: string;
  audio_product_artist?: string | null;
  merchant_name?: string;
}

interface CoverSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: CoverSubmission | null;
  isAdmin?: boolean;
}

const CoverSubmissionDetailModal = ({ 
  isOpen, 
  onClose, 
  submission,
  isAdmin = false 
}: CoverSubmissionDetailModalProps) => {
  if (!submission) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = submission.cover_image_url;
    link.download = `cover-${submission.audio_product_title?.replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cover Submission Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(submission.status)} text-white`}>
              <span className="flex items-center gap-1">
                {getStatusIcon(submission.status)}
                {submission.status.toUpperCase()}
              </span>
            </Badge>
            {submission.status === 'approved' && (
              <Button
                onClick={handleDownload}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Cover
              </Button>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Cover Image</h3>
            <div className="relative">
              <img
                src={submission.cover_image_url}
                alt="Submitted cover"
                className="w-full max-w-md mx-auto rounded-lg"
              />
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Song Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Song Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Title</p>
                <p className="text-white font-medium">{submission.audio_product_title}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Artist</p>
                <p className="text-white font-medium">{submission.audio_product_artist || 'Unknown Artist'}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Submission Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Submission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdmin && (
                <div>
                  <p className="text-gray-400 text-sm">Submitted by</p>
                  <p className="text-white font-medium">{submission.merchant_name || 'Unknown Merchant'}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 text-sm">Submission Date</p>
                <p className="text-white font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
              {submission.reviewed_at && (
                <div>
                  <p className="text-gray-400 text-sm">Reviewed Date</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(submission.reviewed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            {submission.submission_notes && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Submission Notes</p>
                <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                  {submission.submission_notes}
                </p>
              </div>
            )}

            {submission.admin_notes && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Admin Feedback</p>
                <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                  {submission.admin_notes}
                </p>
              </div>
            )}
          </div>

          {/* Contract Information */}
          {submission.status === 'approved' && (
            <>
              <Separator className="bg-gray-600" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Contract Information</h3>
                <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Contract Status</span>
                  </div>
                  {submission.contract_id ? (
                    <p className="text-green-400">Contract generated and ready for signature</p>
                  ) : (
                    <p className="text-yellow-400">Contract generation in progress...</p>
                  )}
                  {submission.contract_generated_at && (
                    <p className="text-gray-300 text-sm mt-1">
                      Generated: {new Date(submission.contract_generated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverSubmissionDetailModal;
