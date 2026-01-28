import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, FileText, ExternalLink, DollarSign, Camera } from "lucide-react";

interface CoverSubmissionData {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  cover_image_url: string;
  cover_photos?: string[] | null;
  requested_advance_price?: number | null;
  negotiation_text?: string | null;
  submission_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contract_id?: string | null;
  requires_contract?: boolean | null;
  contract_generated_at?: string | null;
  merchant_name?: string;
  audio_product_title?: string;
}

interface CoverSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: CoverSubmissionData | null;
  isAdmin?: boolean;
}

const CoverSubmissionDetailModal = ({
  isOpen,
  onClose,
  submission,
  isAdmin = false,
}: CoverSubmissionDetailModalProps) => {
  if (!submission) return null;

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

  // Use cover_photos array if available, otherwise fall back to single cover_image_url
  const photos = submission.cover_photos && submission.cover_photos.length > 0 
    ? submission.cover_photos 
    : [submission.cover_image_url];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cover Application Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cover Photos */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Submitted Photos ({photos.length})
            </h3>
            <div className={`grid gap-3 ${photos.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {photos.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Cover photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-600"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Track Title</h3>
              <p className="text-white">{submission.audio_product_title || 'Unknown Track'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Applicant</h3>
              <p className="text-white">{submission.merchant_name || 'Unknown Merchant'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
              <Badge className={`${getStatusColor(submission.status)} text-white`}>
                {submission.status}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Submitted</h3>
              <div className="flex items-center gap-1 text-white">
                <Calendar className="w-4 h-4" />
                {new Date(submission.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Requested Advance */}
          {(submission.requested_advance_price !== null && submission.requested_advance_price !== undefined) && (
            <div className="bg-green-600/20 border border-green-600/30 p-4 rounded">
              <h3 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Requested Cash Advance
              </h3>
              <p className="text-2xl font-bold text-green-300">
                ${submission.requested_advance_price.toFixed(2)}
              </p>
            </div>
          )}

          {/* Negotiation Text */}
          {submission.negotiation_text && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Why They're Right for This Job</h3>
              <div className="bg-gray-700/50 p-4 rounded border border-gray-600">
                <p className="text-gray-300 whitespace-pre-wrap">{submission.negotiation_text}</p>
              </div>
            </div>
          )}

          {/* Submission Notes (legacy) */}
          {submission.submission_notes && submission.submission_notes !== submission.negotiation_text && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Additional Notes</h3>
              <div className="bg-gray-700/50 p-3 rounded border border-gray-600">
                <p className="text-gray-300 text-sm">{submission.submission_notes}</p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {submission.admin_notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Admin Notes</h3>
              <div className="bg-yellow-600/20 border border-yellow-600/30 p-3 rounded">
                <p className="text-yellow-200 text-sm">{submission.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Review Information */}
          {submission.reviewed_at && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Reviewed Date</h3>
                <div className="flex items-center gap-1 text-white">
                  <Calendar className="w-4 h-4" />
                  {new Date(submission.reviewed_at).toLocaleDateString()}
                </div>
              </div>
              {submission.reviewed_by && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Reviewed By</h3>
                  <div className="flex items-center gap-1 text-white">
                    <User className="w-4 h-4" />
                    Admin
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contract Information */}
          {submission.contract_id && (
            <div className="bg-blue-600/20 border border-blue-600/30 p-4 rounded">
              <h3 className="text-blue-400 font-medium mb-2">Contract Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  <span className="font-medium">Contract ID:</span> {submission.contract_id}
                </p>
                {submission.contract_generated_at && (
                  <p className="text-gray-300">
                    <span className="font-medium">Generated:</span>{' '}
                    {new Date(submission.contract_generated_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center gap-1 text-blue-400">
                  <ExternalLink className="w-4 h-4" />
                  <span>Contract available in merchant dashboard</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverSubmissionDetailModal;
