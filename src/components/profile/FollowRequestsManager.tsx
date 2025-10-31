import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFollowRequest } from '@/hooks/useFollowRequest';
import { UserCheck, UserX, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FollowRequestsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FollowRequestsManager = ({ isOpen, onClose }: FollowRequestsManagerProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getReceivedRequests, approveRequest, rejectRequest } = useFollowRequest();

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await getReceivedRequests();
    setRequests(data);
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    const { error } = await approveRequest(requestId);
    if (!error) {
      await fetchRequests();
    }
  };

  const handleReject = async (requestId: string) => {
    const { error } = await rejectRequest(requestId);
    if (!error) {
      await fetchRequests();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-gray-800 border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <DialogTitle className="text-white">Follow Requests</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending follow requests</p>
            </div>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="p-4 bg-gray-700/50 border-gray-600">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.requester?.avatar_url} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {request.requester?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {request.requester?.display_name || 'Anonymous'}
                      </p>
                      {request.requester?.user_type && (
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                          {request.requester.user_type}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>

                    <div className="bg-gray-800/50 rounded p-3 mb-3">
                      <p className="text-xs font-medium text-gray-400 mb-1">Intent:</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {request.intent_message}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
