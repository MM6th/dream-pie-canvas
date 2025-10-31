import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFollowRequest } from '@/hooks/useFollowRequest';
import { Lock } from 'lucide-react';

interface FollowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMerchantId: string;
  targetMerchantName: string;
  onSuccess: () => void;
}

export const FollowRequestModal = ({
  isOpen,
  onClose,
  targetMerchantId,
  targetMerchantName,
  onSuccess,
}: FollowRequestModalProps) => {
  const [intentMessage, setIntentMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendFollowRequest } = useFollowRequest();

  const handleSubmit = async () => {
    if (!intentMessage.trim()) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await sendFollowRequest(targetMerchantId, intentMessage);
    setIsSubmitting(false);

    if (!error) {
      setIntentMessage('');
      onSuccess();
      onClose();
    }
  };

  const handleClose = () => {
    setIntentMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <DialogTitle className="text-white">Request to Follow</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Send a follow request to {targetMerchantName}. This is for business purposes only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="intent" className="text-white">
              Intent <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="intent"
              placeholder="Please explain your business intent and why you would like to connect with this profile..."
              value={intentMessage}
              onChange={(e) => setIntentMessage(e.target.value)}
              maxLength={500}
              rows={6}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 resize-none"
            />
            <p className="text-sm text-gray-400 text-right">
              {intentMessage.length} / 500
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!intentMessage.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Sending...' : 'Send Follow Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
