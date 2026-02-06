import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DistributionObligation {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  totalCreditsReceived: number;
  amountOwed: number;
  messageCount: number;
}

export interface DistributionSummary {
  obligations: DistributionObligation[];
  totalOwed: number;
  isLoading: boolean;
}

/**
 * Calculates what PIE (admin) owes in distributions to users
 * from messaging revenue (recipients get 90% of credits spent on messages to them).
 */
export const useDistributionObligations = (isAdmin: boolean): DistributionSummary => {
  const [obligations, setObligations] = useState<DistributionObligation[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchObligations = async () => {
      setIsLoading(true);
      try {
        // Get all credit transactions for messages sent
        const { data: transactions, error: txError } = await supabase
          .from('credit_transactions')
          .select('amount, related_message_id')
          .eq('type', 'spent')
          .like('description', 'Message to%');

        if (txError || !transactions?.length) {
          setIsLoading(false);
          return;
        }

        // Get message recipients for these transactions
        const messageIds = transactions
          .map(t => t.related_message_id)
          .filter(Boolean) as string[];

        if (!messageIds.length) {
          setIsLoading(false);
          return;
        }

        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, recipient_id')
          .in('id', messageIds);

        if (msgError || !messages?.length) {
          setIsLoading(false);
          return;
        }

        // Build recipient → total credits map
        const recipientCredits = new Map<string, number>();
        const recipientMsgCount = new Map<string, number>();

        for (const tx of transactions) {
          const msg = messages.find(m => m.id === tx.related_message_id);
          if (msg) {
            const current = recipientCredits.get(msg.recipient_id) || 0;
            recipientCredits.set(msg.recipient_id, current + tx.amount);
            const count = recipientMsgCount.get(msg.recipient_id) || 0;
            recipientMsgCount.set(msg.recipient_id, count + 1);
          }
        }

        // Get recipient profiles
        const recipientIds = Array.from(recipientCredits.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', recipientIds);

        // Check what's already been paid out
        const { data: payouts } = await supabase
          .from('merchant_payouts')
          .select('merchant_id, amount, status')
          .in('merchant_id', recipientIds)
          .in('status', ['paid', 'processing', 'pending']);

        const paidMap = new Map<string, number>();
        if (payouts) {
          for (const p of payouts) {
            const current = paidMap.get(p.merchant_id) || 0;
            paidMap.set(p.merchant_id, current + p.amount);
          }
        }

        const result: DistributionObligation[] = recipientIds.map(id => {
          const profile = profiles?.find(p => p.id === id);
          const totalCredits = recipientCredits.get(id) || 0;
          const grossOwed = totalCredits * 0.9; // 90% revenue share
          const alreadyPaid = paidMap.get(id) || 0;
          const netOwed = Math.max(0, grossOwed - alreadyPaid);

          return {
            recipientId: id,
            recipientName: profile?.display_name || 'Unknown User',
            recipientEmail: profile?.email || '',
            totalCreditsReceived: totalCredits,
            amountOwed: netOwed,
            messageCount: recipientMsgCount.get(id) || 0,
          };
        }).filter(o => o.amountOwed > 0);

        setObligations(result);
        setTotalOwed(result.reduce((sum, o) => sum + o.amountOwed, 0));
      } catch (error) {
        console.error('Error fetching distribution obligations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchObligations();
  }, [isAdmin]);

  return { obligations, totalOwed, isLoading };
};
