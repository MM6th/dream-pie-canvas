import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Clock } from 'lucide-react';
import { FollowRequestModal } from './FollowRequestModal';
import type { FollowStatus } from '@/hooks/useFollowRequest';

interface PrivateProfileOverlayProps {
  merchantId: string;
  merchantName: string;
  followStatus: FollowStatus;
  onRequestSent: () => void;
}

export const PrivateProfileOverlay = ({
  merchantId,
  merchantName,
  followStatus,
  onRequestSent,
}: PrivateProfileOverlayProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <Card className="max-w-md w-full p-8 bg-gray-800/50 border-gray-700 text-center">
          <div className="flex justify-center mb-4">
            {followStatus === 'pending' ? (
              <Clock className="w-16 h-16 text-yellow-400" />
            ) : (
              <Lock className="w-16 h-16 text-blue-400" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {followStatus === 'pending' ? 'Follow Request Pending' : 'This Profile is Private'}
          </h2>

          <p className="text-gray-400 mb-6">
            {followStatus === 'pending'
              ? `Your follow request to ${merchantName} is pending approval. You'll be notified once they respond.`
              : 'Send a follow request to connect for business purposes and view their content.'}
          </p>

          {followStatus === 'none' && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              Request to Follow
            </Button>
          )}

          {followStatus === 'pending' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                Request sent. Awaiting approval.
              </p>
            </div>
          )}
        </Card>
      </div>

      <FollowRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetMerchantId={merchantId}
        targetMerchantName={merchantName}
        onSuccess={onRequestSent}
      />
    </>
  );
};
