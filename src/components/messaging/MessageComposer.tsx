import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Image as ImageIcon, X } from 'lucide-react';
import { CreditPurchaseModal } from './CreditPurchaseModal';
import ImagePicker from '@/components/ImagePicker';

interface MessageComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName?: string;
  currentBalance?: number;
  isFree?: boolean;
  onMessageSent?: () => void;
  replyToMessageId?: string;
  originalSubject?: string;
  originalBody?: string;
}

export const MessageComposer = ({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  currentBalance = 0,
  isFree = false,
  onMessageSent,
  replyToMessageId,
  originalSubject,
  originalBody,
}: MessageComposerProps) => {
  const isReply = !!replyToMessageId;
  const [subject, setSubject] = useState(isReply && originalSubject ? `Re: ${originalSubject.replace(/^Re:\s*/, '')}` : '');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const { toast } = useToast();

  const creditsRequired = isFree ? 0 : 1; // Free for merchant-to-merchant and merchant replies

  const handleCreditSectionClick = () => {
    if (currentBalance < creditsRequired) {
      toast({
        title: 'Purchase Messaging Credits',
        description: 'You need at least 1 credit to send a message. Select a package to continue.',
      });
      setShowCreditPurchase(true);
    }
  };

  const handlePurchaseComplete = () => {
    onMessageSent?.(); // This will trigger balance refresh
    toast({
      title: 'Credits Added!',
      description: 'Your credits have been added. You can now send your message.',
    });
  };

  const handleSend = async () => {
    if (subject.length < 5) {
      toast({
        title: 'Invalid Subject',
        description: 'Subject must be at least 5 characters',
        variant: 'destructive',
      });
      return;
    }

    if (body.length < 20) {
      toast({
        title: 'Invalid Message',
        description: 'Message must be at least 20 characters',
        variant: 'destructive',
      });
      return;
    }

    if (body.length > 1000) {
      toast({
        title: 'Message Too Long',
        description: 'Message must be less than 1000 characters',
        variant: 'destructive',
      });
      return;
    }

    if (!isFree && currentBalance < creditsRequired) {
      toast({
        title: 'Insufficient Credits',
        description: `You need ${creditsRequired} credit(s) but have ${currentBalance}. Please purchase more credits.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          recipientId,
          subject,
          body,
          parentMessageId: replyToMessageId,
          attachmentUrl: attachmentUrl || null,
        },
      });

      if (error) throw error;

      toast({
        title: 'Message Sent!',
        description: data.isFree 
          ? 'Your message has been sent for free (merchant-to-merchant).' 
          : `Your message has been sent. ${data.remainingBalance} credits remaining.`,
      });

      setSubject('');
      setBody('');
      setAttachmentUrl('');
      onMessageSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const characterCount = body.length;
  const characterLimit = 1000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply to' : 'Send Message to'} {recipientName || 'User'}</DialogTitle>
          <DialogDescription>
            {isFree 
              ? isReply ? 'Replies are free for merchants' : 'Merchant-to-merchant messaging is free'
              : `This message will cost ${creditsRequired} credit${creditsRequired !== 1 ? 's' : ''}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isReply && originalBody && (
            <div className="p-3 bg-muted rounded-lg border-l-4 border-primary">
              <p className="text-xs text-muted-foreground mb-1">Original message:</p>
              <p className="text-sm line-clamp-3 whitespace-pre-wrap">{originalBody}</p>
            </div>
          )}
          {!isFree && (
            <div 
              onClick={handleCreditSectionClick}
              className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                currentBalance < creditsRequired 
                  ? 'bg-amber-500/10 border-2 border-amber-500/50 hover:bg-amber-500/20 animate-pulse' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Current Balance: {currentBalance} credits
                </span>
              </div>
              {currentBalance < creditsRequired && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Click to purchase
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message</Label>
              <span className={`text-xs ${
                characterCount > characterLimit ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {characterCount} / {characterLimit}
              </span>
            </div>
            <Textarea
              id="body"
              placeholder="Enter your message (minimum 20 characters)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Photo Attachment (Optional)</Label>
            {attachmentUrl ? (
              <div className="relative">
                <img 
                  src={attachmentUrl} 
                  alt="Attachment" 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setAttachmentUrl('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <ImagePicker
                onImageSelect={setAttachmentUrl}
                currentImageUrl={attachmentUrl}
                trigger={
                  <Button type="button" variant="outline" className="w-full">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Attach Photo
                  </Button>
                }
              />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || currentBalance < creditsRequired}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send (${creditsRequired} credit${creditsRequired !== 1 ? 's' : ''})`
            )}
          </Button>
        </div>
      </DialogContent>

      <CreditPurchaseModal
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </Dialog>
  );
};