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
import { Loader2, CreditCard } from 'lucide-react';

interface MessageComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName?: string;
  currentBalance?: number;
  isFree?: boolean;
  onMessageSent?: () => void;
}

export const MessageComposer = ({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  currentBalance = 0,
  isFree = false,
  onMessageSent,
}: MessageComposerProps) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const creditsRequired = isFree ? 0 : 1; // Free for merchant-to-merchant

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
          <DialogTitle>Send Message to {recipientName || 'User'}</DialogTitle>
          <DialogDescription>
            {isFree 
              ? 'Merchant-to-merchant messaging is free' 
              : `This message will cost ${creditsRequired} credit${creditsRequired !== 1 ? 's' : ''}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isFree && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Current Balance: {currentBalance} credits
                </span>
              </div>
              {currentBalance < creditsRequired && (
                <span className="text-xs text-destructive font-medium">
                  Insufficient credits
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
    </Dialog>
  );
};