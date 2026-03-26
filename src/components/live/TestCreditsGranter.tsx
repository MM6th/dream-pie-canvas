import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";

const TestCreditsGranter = () => {
  const { user } = useAuth();
  const { balance, refetch } = useMessagingCredits(user?.id);
  const [granting, setGranting] = useState(false);

  const grantTestCredits = async () => {
    if (!user) return;
    setGranting(true);

    try {
      // Upsert credits - add 100 test credits
      const { data: existing } = await supabase
        .from("messaging_credits")
        .select("balance, total_purchased")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("messaging_credits")
          .update({
            balance: existing.balance + 100,
            total_purchased: existing.total_purchased + 100,
          })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("messaging_credits")
          .insert({
            user_id: user.id,
            balance: 100,
            total_purchased: 100,
            total_spent: 0,
          });
        if (error) throw error;
      }

      // Record test transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "test_grant",
        amount: 100,
        description: "Test credits granted for 1-on-1 testing",
      });

      await refetch();
      toast({ title: "Test Credits Granted!", description: "100 test credits added to your balance." });
    } catch (err: any) {
      console.error("Error granting test credits:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins className="w-4 h-4" />
          Test Mode — Credits
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">TEST</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Current balance: <span className="font-bold text-foreground">{balance} credits</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
          onClick={grantTestCredits}
          disabled={granting}
        >
          {granting ? "Granting..." : "Grant 100 Test Credits"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCreditsGranter;
