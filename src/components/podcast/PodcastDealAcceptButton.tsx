import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, FileText, CheckCircle } from 'lucide-react';

interface PodcastDealAcceptButtonProps {
  sessionTitle: string;
  senderId: string;
  senderName: string;
  messageId: string;
  onAccepted?: () => void;
}

const COMPANY_NAME = 'PRIVATE INVESTIGATION ENTERPRISES';

export const PodcastDealAcceptButton = ({
  sessionTitle,
  senderId,
  senderName,
  messageId,
  onAccepted,
}: PodcastDealAcceptButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [signature, setSignature] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const generateContractTerms = (hostName: string, guestName: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
PODCAST GUEST COLLABORATION AGREEMENT

Company: ${COMPANY_NAME}
Date: ${today}

PARTIES:
- Host: ${hostName}
- Guest: ${guestName}

EPISODE TITLE: ${sessionTitle}

AGREEMENT TERMS:

1. PURPOSE
This agreement establishes the revenue sharing arrangement between the Host and Guest for podcast episode(s) created through collaboration on the PIE Platform.

2. REVENUE SPLIT
Both parties agree to a 50/50 revenue split calculated as follows:
- PayPal processing fees (~3%) are deducted first
- PIE Platform takes 10% of the remaining amount
- The remaining revenue is split equally (50/50) between Host and Guest

3. EXAMPLE CALCULATION
For a $5.00 episode purchase:
- PayPal Processing Fee (~3%): $0.15
- Subtotal after PayPal: $4.85
- PIE Platform Fee (10%): $0.49
- Remaining Revenue: $4.36
- Host Share (50%): $2.18
- Guest Share (50%): $2.18

4. CONTENT RIGHTS
- Both Host and Guest retain rights to their individual contributions
- The combined podcast episode may be distributed on PIE Platform and other platforms
- Neither party may independently sell or distribute the collaborative content without written consent

5. PAYMENT TERMS
- Revenue shares are distributed monthly
- Minimum payout threshold: $50.00
- Payments are made via PayPal to the email on file

6. REPRESENTATIONS
Both parties represent that:
- They have the right to participate in this collaboration
- They will not include copyrighted material without proper licensing
- All content is original or properly licensed

7. TERMINATION
This agreement remains in effect for as long as the episode is available for sale. Either party may request removal of the episode with 30 days written notice.

8. GOVERNING LAW
This agreement is governed by the laws applicable to the PIE Platform Terms of Service.

BY SIGNING BELOW, BOTH PARTIES AGREE TO THE TERMS ABOVE.
    `.trim();
  };

  const handleAcceptDeal = async () => {
    if (!user || !signature.trim()) return;

    setIsAccepting(true);
    try {
      // Get current user's profile for the contract
      const { data: guestProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      // Get host's profile
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', senderId)
        .single();

      const hostName = hostProfile?.display_name || 'Host';
      const guestName = guestProfile?.display_name || 'Guest';
      const contractTerms = generateContractTerms(hostName, guestName);

      // Find the podcast invitation
      const { data: invitation } = await supabase
        .from('podcast_invitations')
        .select('id')
        .eq('host_user_id', senderId)
        .eq('guest_user_id', user.id)
        .eq('session_title', sessionTitle)
        .eq('status', 'pending')
        .single();

      // Create the contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          merchant_id: user.id,
          contract_type: 'podcast_guest_agreement',
          contract_terms: contractTerms,
          merchant_signature: signature,
          signed_at: new Date().toISOString(),
          status: 'pending_host_signature',
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Update the invitation with the contract ID
      if (invitation) {
        await supabase
          .from('podcast_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            contract_id: contract.id,
          })
          .eq('id', invitation.id);
      }

      // Send notification to host
      await supabase.from('notifications').insert({
        user_id: senderId,
        type: 'podcast_deal_accepted',
        title: 'Podcast Deal Accepted',
        message: `${guestName} has accepted your podcast collaboration invitation for "${sessionTitle}". Please sign the contract to finalize the agreement.`,
      });

      setIsAccepted(true);
      setShowConfirmDialog(false);
      toast({
        title: 'Deal Accepted!',
        description: 'The contract has been created. The host will be notified to sign.',
      });
      onAccepted?.();
    } catch (error) {
      console.error('Error accepting deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept the deal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isAccepted) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg my-3">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <span className="text-green-700 dark:text-green-300 font-medium">
          Deal Accepted! Contract created.
        </span>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        className="my-3 bg-green-600 hover:bg-green-700"
      >
        <FileText className="w-4 h-4 mr-2" />
        Accept Podcast Deal
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Podcast Collaboration Agreement</DialogTitle>
            <DialogDescription>
              Review the terms below and sign to accept the podcast deal with {senderName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Episode: {sessionTitle}</h4>
                <p className="text-sm text-muted-foreground">
                  By signing this agreement, you agree to a 50/50 revenue split with the host
                  after PayPal fees and PIE's 10% platform fee.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">Revenue Split Breakdown:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>PayPal Processing (~3%): Deducted first</li>
                  <li>PIE Platform Fee (10%): Supports hosting & distribution</li>
                  <li>Host Share: 50% of remaining</li>
                  <li>Your Share: 50% of remaining</li>
                </ul>

                <div className="p-3 bg-primary/10 rounded-lg">
                  <h5 className="font-medium">Example: $5.00 Episode Sale</h5>
                  <ul className="text-xs mt-1 space-y-0.5">
                    <li>PayPal Fee: -$0.15</li>
                    <li>PIE Fee: -$0.49</li>
                    <li>Host: $2.18</li>
                    <li>You: $2.18</li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Your Obligations:</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Provide original content without copyright infringement</li>
                  <li>Allow distribution on PIE Platform and associated channels</li>
                  <li>Not redistribute the collaborative content independently</li>
                </ul>
              </div>
            </div>
          </ScrollArea>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="signature">Your Signature (Type your full name)</Label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name to sign"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              By signing, you agree to the terms above and acknowledge this is a legally binding agreement.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAcceptDeal}
              disabled={!signature.trim() || isAccepting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Contract...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Sign & Accept Deal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PodcastDealAcceptButton;
