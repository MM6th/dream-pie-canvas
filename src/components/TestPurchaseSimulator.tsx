import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TestTube, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  price: number | null;
  is_free: boolean;
}

const TestPurchaseSimulator = () => {
  const [audioProductId, setAudioProductId] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAudioProducts();
  }, []);

  const fetchAudioProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select('id, title, artist_name, price, is_free')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudioProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching audio products:', error);
      toast({
        title: "Error",
        description: "Failed to load audio products",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const runSimulation = async () => {
    if (!audioProductId) {
      toast({
        title: "Error",
        description: "Please enter an audio product ID",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-purchase-simulation', {
        body: {
          audioProductId,
          referrerId: referrerId || null
        }
      });

      if (error) throw error;

      setLastResult(data);
      toast({
        title: "✅ Simulation Complete",
        description: "Test purchase created successfully. Check SE Calculator for updates.",
      });
    } catch (error: any) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const cleanupTests = async () => {
    setIsCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-test-purchases');

      if (error) throw error;

      setLastResult(null);
      toast({
        title: "✅ Cleanup Complete",
        description: data.message,
      });
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TestTube className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Purchase Test Simulator</h3>
        </div>

        <p className="text-sm text-gray-400">
          Simulate a music purchase to test revenue distribution and SE Calculator updates without real money.
        </p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="productId" className="text-gray-300">Select Audio Product *</Label>
            <Select value={audioProductId} onValueChange={setAudioProductId}>
              <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Choose a music product"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-600">
                {audioProducts.map((product) => (
                  <SelectItem 
                    key={product.id} 
                    value={product.id}
                    className="text-white hover:bg-gray-800"
                  >
                    {product.title} 
                    {product.artist_name && ` - ${product.artist_name}`}
                    {product.is_free ? ' (Free)' : product.price ? ` ($${product.price})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referrerId" className="text-gray-300">Referrer User ID (optional)</Label>
            <Input
              id="referrerId"
              value={referrerId}
              onChange={(e) => setReferrerId(e.target.value)}
              placeholder="Enter referrer user ID (if any)"
              className="bg-gray-900 border-gray-600 text-white"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={runSimulation}
            disabled={isSimulating || !audioProductId}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Run Test Purchase
              </>
            )}
          </Button>

          <Button
            onClick={cleanupTests}
            disabled={isCleaningUp}
            variant="destructive"
          >
            {isCleaningUp ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Cleanup All Tests
              </>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-green-400 mb-2">Last Simulation Results</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <p>Purchase ID: <span className="text-white">{lastResult.purchaseId}</span></p>
              <p className="font-semibold mt-2">Revenue Breakdown:</p>
              <p>• Product Price: ${lastResult.breakdown.productPrice.toFixed(2)}</p>
              <p>• PayPal Fee: ${lastResult.breakdown.paypalFee.toFixed(2)}</p>
              <p>• Platform Fee: ${lastResult.breakdown.platformFee.toFixed(2)}</p>
              <p>• Merchant Revenue: ${lastResult.breakdown.merchantRevenue.toFixed(2)}</p>
              {lastResult.breakdown.referrerCommission > 0 && (
                <p>• Referrer Commission: ${lastResult.breakdown.referrerCommission.toFixed(2)}</p>
              )}
              {lastResult.breakdown.featuringArtistRevenue > 0 && (
                <p>• Featuring Artist Revenue: ${lastResult.breakdown.featuringArtistRevenue.toFixed(2)}</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-200">
          <p className="font-semibold mb-1">⚠️ Test Mode Notice:</p>
          <p>• All test purchases use "TEST_" prefix in transaction IDs</p>
          <p>• Revenue is added to quarterly income for all parties</p>
          <p>• Use "Cleanup All Tests" to reverse all test transactions</p>
          <p>• Check the SE Tax Calculator to verify income updates</p>
        </div>
      </div>
    </Card>
  );
};

export default TestPurchaseSimulator;
