import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TestTube, Trash2, Music, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  price: number | null;
  is_free: boolean;
}

interface AstrologyProduct {
  id: string;
  title: string;
  product_type: string;
  delivery_type: string;
  total_price: number;
}

const TestPurchaseSimulator = () => {
  const [productType, setProductType] = useState<"audio" | "astrology">("audio");
  const [audioProductId, setAudioProductId] = useState("");
  const [astrologyProductId, setAstrologyProductId] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [astrologyProducts, setAstrologyProducts] = useState<AstrologyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [productType]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      if (productType === "audio") {
        const { data, error } = await supabase
          .from('audio_products')
          .select('id, title, artist_name, price, is_free')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAudioProducts(data || []);
      } else {
        const { data, error } = await supabase
          .from('astrology_products')
          .select('id, title, product_type, delivery_type, total_price')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAstrologyProducts(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: `Failed to load ${productType} products`,
        variant: "destructive"
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const runSimulation = async () => {
    const selectedProductId = productType === "audio" ? audioProductId : astrologyProductId;
    
    if (!selectedProductId) {
      toast({
        title: "Error",
        description: `Please select a ${productType} product`,
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    try {
      const functionName = productType === "audio" 
        ? 'test-purchase-simulation' 
        : 'test-astrology-purchase-simulation';
      
      const body = productType === "audio"
        ? { audioProductId, referrerId: referrerId || null }
        : { astrologyProductId };

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      setLastResult({ ...data, productType });
      
      // Refresh quarterly income to update SE Calculator
      window.location.reload();
      
      toast({
        title: "✅ Simulation Complete",
        description: `Test ${productType} purchase created successfully. SE Calculator has been updated with new income.`,
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
      
      // Reload page to refresh quarterly income data
      setTimeout(() => window.location.reload(), 1000);
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

  const formatProductType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDeliveryType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TestTube className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Purchase Test Simulator</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Simulate purchases to test revenue distribution and SE Calculator updates without real money.
        </p>

        <Tabs value={productType} onValueChange={(v) => setProductType(v as "audio" | "astrology")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio Products
            </TabsTrigger>
            <TabsTrigger value="astrology" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Astrology Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-3 mt-4">
            <div>
              <Label htmlFor="audioProduct">Select Audio Product *</Label>
              <Select value={audioProductId} onValueChange={setAudioProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Choose a music product"} />
                </SelectTrigger>
                <SelectContent>
                  {audioProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title} 
                      {product.artist_name && ` - ${product.artist_name}`}
                      {product.is_free ? ' (Free)' : product.price ? ` ($${product.price})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="referrerId">Referrer User ID (optional)</Label>
              <Input
                id="referrerId"
                value={referrerId}
                onChange={(e) => setReferrerId(e.target.value)}
                placeholder="Enter referrer user ID (if any)"
              />
            </div>
          </TabsContent>

          <TabsContent value="astrology" className="space-y-3 mt-4">
            <div>
              <Label htmlFor="astrologyProduct">Select Astrology Product *</Label>
              <Select value={astrologyProductId} onValueChange={setAstrologyProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Choose an astrology product"} />
                </SelectTrigger>
                <SelectContent>
                  {astrologyProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        {product.title} - {formatProductType(product.product_type)} 
                        ({formatDeliveryType(product.delivery_type)}) - ${product.total_price}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Astrology purchases will create a delivery record with a 3-day deadline and trigger notifications to both buyer and seller.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={runSimulation}
            disabled={isSimulating || (productType === "audio" ? !audioProductId : !astrologyProductId)}
            className="w-full sm:flex-1"
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
            className="w-full sm:w-auto"
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
          <div className="mt-4 p-4 bg-muted rounded-lg border">
            <h4 className="text-sm font-semibold text-primary mb-2">Last Simulation Results</h4>
            <div className="text-xs space-y-1">
              {lastResult.productType === "audio" ? (
                <>
                  <p>Purchase ID: <span className="font-medium">{lastResult.purchaseId}</span></p>
                  <p className="font-semibold mt-2">Revenue Breakdown:</p>
                  <p>• Product Price: ${lastResult.breakdown.productPrice.toFixed(2)} (100%)</p>
                  <p>• PayPal Fee: ${lastResult.breakdown.paypalFee.toFixed(2)} ({((lastResult.breakdown.paypalFee / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  <p>• Platform Fee: ${lastResult.breakdown.platformFee.toFixed(2)} ({((lastResult.breakdown.platformFee / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  <p>• Merchant Revenue: ${lastResult.breakdown.merchantRevenue.toFixed(2)} ({((lastResult.breakdown.merchantRevenue / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  {lastResult.breakdown.referrerCommission > 0 && (
                    <p>• Referrer Commission: ${lastResult.breakdown.referrerCommission.toFixed(2)} ({((lastResult.breakdown.referrerCommission / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  )}
                  {lastResult.breakdown.featuringArtistRevenue > 0 && (
                    <p>• Featuring Artist Revenue: ${lastResult.breakdown.featuringArtistRevenue.toFixed(2)} ({((lastResult.breakdown.featuringArtistRevenue / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  )}
                </>
              ) : (
                <>
                  <p>Purchase ID: <span className="font-medium">{lastResult.purchaseId}</span></p>
                  <p>Delivery ID: <span className="font-medium">{lastResult.deliveryId}</span></p>
                  <p className="font-semibold mt-2">Revenue Breakdown:</p>
                  <p>• Product Price: ${lastResult.breakdown.productPrice.toFixed(2)} (100%)</p>
                  <p>• PayPal Fee: ${lastResult.breakdown.paypalFee.toFixed(2)} ({((lastResult.breakdown.paypalFee / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  <p>• Platform Fee: ${lastResult.breakdown.platformFee.toFixed(2)} ({((lastResult.breakdown.platformFee / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  <p>• Admin Revenue: ${lastResult.breakdown.adminRevenue.toFixed(2)} ({((lastResult.breakdown.adminRevenue / lastResult.breakdown.productPrice) * 100).toFixed(1)}%)</p>
                  <p className="font-semibold mt-2">Delivery Info:</p>
                  <p>• Deadline: {new Date(lastResult.breakdown.deliveryDeadline).toLocaleString()}</p>
                  <p>• Status: Pending (awaiting video upload)</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-600 dark:text-yellow-400">
          <p className="font-semibold mb-1">⚠️ Test Mode Notice:</p>
          <p>• All test purchases use "TEST_" or "TEST_ASTRO_" prefix in transaction IDs</p>
          <p>• Revenue is added to quarterly income for all parties</p>
          <p>• Astrology purchases create delivery records and notifications</p>
          <p>• Use "Cleanup All Tests" to reverse all test transactions</p>
          <p>• Check the SE Tax Calculator to verify income updates</p>
        </div>
      </div>
    </Card>
  );
};

export default TestPurchaseSimulator;
