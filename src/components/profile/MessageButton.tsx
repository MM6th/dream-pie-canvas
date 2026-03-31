import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import beeperIcon from '@/assets/beeper-message.png';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { useMessagingCredits } from '@/hooks/useMessagingCredits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MessageButtonProps {
  recipientId: string;
  recipientName: string;
  recipientType: string;
}

export const MessageButton = ({ recipientId, recipientName, recipientType }: MessageButtonProps) => {
  const { user } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);
  const { balance, refetch } = useMessagingCredits(user?.id);
  const [senderType, setSenderType] = useState<string>('');

  // Get sender's user type
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setSenderType(data?.user_type || '');
        });
    }
  }, [user]);

  if (!user || user.id === recipientId) {
    return null;
  }

  // Block supporter-to-supporter messaging
  if (senderType === 'supporter' && recipientType === 'supporter') {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setComposerOpen(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        <img src={beeperIcon} alt="Message" className="w-8 h-8 mr-2 object-contain" />
        Send Message
      </Button>

      <MessageComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        recipientId={recipientId}
        recipientName={recipientName}
        currentBalance={balance}
        onMessageSent={refetch}
      />
    </>
  );
};
