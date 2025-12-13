import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, Reply } from 'lucide-react';
import { MessageComposer } from './MessageComposer';
import { useMessagingCredits } from '@/hooks/useMessagingCredits';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  attachment_url: string | null;
  sender?: { display_name: string; avatar_url: string | null; user_type?: string };
  recipient?: { display_name: string; avatar_url: string | null };
}

export const MessagingInbox = () => {
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('received');
  const { balance, refetch: refetchCredits } = useMessagingCredits(userId);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Get user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      setUserType(profile?.user_type || '');

      // Fetch sent messages
      const { data: sent, error: sentError } = await supabase
        .from('messages')
        .select(`
          *,
          recipient:profiles!messages_recipient_id_fkey(display_name, avatar_url)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      setSentMessages(sent || []);

      // Fetch received messages
      const { data: received, error: receivedError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, avatar_url, user_type)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;
      setReceivedMessages(received || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setReceivedMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.read_at && message.recipient_id) {
      markAsRead(message.id);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedMessage(null);
  };

  const handleReply = () => {
    if (selectedMessage) {
      setShowReplyComposer(true);
    }
  };

  const handleMessageSent = () => {
    setShowReplyComposer(false);
    fetchMessages();
    refetchCredits();
  };

  // Determine if reply is free:
  // 1. Merchant replying to merchant (always free)
  // 2. Supporter replying to merchant-initiated message (free)
  const isReplyFree = 
    (userType === 'merchant' && selectedMessage?.sender?.user_type === 'merchant') ||
    (userType === 'supporter' && selectedMessage?.sender?.user_type === 'merchant' && selectedMessage?.sender_id !== userId);

  const unreadCount = receivedMessages.filter((msg) => !msg.read_at).length;

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Messages</h3>
            <p className="text-sm text-muted-foreground">Manage your sent and received messages</p>
          </div>
        </div>

        <Tabs defaultValue="received" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="received" className="flex-1">
              Received
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex-1">Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-4">
            <div className="space-y-2">
              {sentMessages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No sent messages
                  </CardContent>
                </Card>
              ) : (
                sentMessages.map((message) => (
                  <Card
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedMessage?.id === message.id ? 'border-primary' : ''
                    }`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            To: {message.recipient?.display_name || 'Unknown'}
                          </div>
                          <div className="text-sm truncate">{message.subject}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <MailOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="received" className="mt-4">
            <div className="space-y-2">
              {receivedMessages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No received messages
                  </CardContent>
                </Card>
              ) : (
                receivedMessages.map((message) => (
                  <Card
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      !message.read_at ? 'border-primary' : ''
                    } ${
                      selectedMessage?.id === message.id ? 'border-primary' : ''
                    }`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            From: {message.sender?.display_name || 'Unknown'}
                          </div>
                          <div className="text-sm truncate">{message.subject}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {!message.read_at ? (
                          <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedMessage && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">Selected Message</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <Card className="border-primary">
            <CardContent className="py-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{selectedMessage.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMessage.sender_id === userId
                      ? `To: ${selectedMessage.recipient?.display_name || 'Unknown'}`
                      : `From: ${selectedMessage.sender?.display_name || 'Unknown'}`
                    }
                    {' • '}
                    {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
                  {selectedMessage.body.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                    if (part.match(/^https?:\/\/[^\s]+$/)) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="!text-blue-500 underline hover:!text-blue-400 break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {part}
                        </a>
                      );
                    }
                    return <span key={index}>{part}</span>;
                  })}
                </div>
                {selectedMessage.attachment_url && (
                  <div>
                    <img 
                      src={selectedMessage.attachment_url} 
                      alt="Message attachment" 
                      className="max-w-full h-auto rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={handleReply} size="sm">
                    <Reply className="w-4 h-4 mr-2" />
                    Reply {isReplyFree && '(Free)'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedMessage && (
        <MessageComposer
          open={showReplyComposer}
          onOpenChange={setShowReplyComposer}
          recipientId={selectedMessage.sender_id === userId ? selectedMessage.recipient_id : selectedMessage.sender_id}
          recipientName={selectedMessage.sender_id === userId ? selectedMessage.recipient?.display_name : selectedMessage.sender?.display_name}
          currentBalance={balance}
          isFree={isReplyFree}
          onMessageSent={handleMessageSent}
          replyToMessageId={selectedMessage.id}
          originalSubject={selectedMessage.subject}
          originalBody={selectedMessage.body}
        />
      )}
    </>
  );
};