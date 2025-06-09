
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Download, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  audio_type: string;
  thumbnail_url: string | null;
  audio_file_url: string;
  album_id: string | null;
  is_free: boolean;
  price: number | null;
  created_at: string;
  albums?: {
    name: string;
  };
}

const StorePage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AudioProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      // Fetch ALL products for the store, not just current user's products
      const { data, error } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          audio_type,
          thumbnail_url,
          audio_file_url,
          album_id,
          is_free,
          price,
          created_at,
          albums (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFreeDownload = async (product: AudioProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download audio",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user already has this free audio
      const { data: existingPurchase } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('audio_product_id', product.id)
        .single();

      if (existingPurchase) {
        toast({
          title: "Already in your library",
          description: "This audio is already available in your audio player",
        });
        return;
      }

      // Record the free download
      const { error } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          audio_product_id: product.id,
          is_free_download: true,
          amount_paid: 0,
        });

      if (error) throw error;

      toast({
        title: "Audio added to library!",
        description: "The audio has been added to your audio player in the dashboard",
      });

    } catch (error: any) {
      console.error('Error recording free download:', error);
      toast({
        title: "Error",
        description: "Failed to add audio to your library. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePurchase = async (product: AudioProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    if (product.is_free) {
      await handleFreeDownload(product);
      return;
    }

    setPurchasingId(product.id);

    try {
      console.log('Starting payment process for product:', product.id);
      
      const { data, error } = await supabase.functions.invoke('create-paypal-payment', {
        body: { audioProductId: product.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      console.log('Payment response:', data, 'Error:', error);

      if (error) {
        console.error('Payment creation error:', error);
        throw error;
      }

      if (data?.approvalUrl) {
        console.log('Redirecting to PayPal:', data.approvalUrl);
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading store...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Audio Store</h1>
          <p className="text-gray-300">Discover amazing audio content from creators</p>
        </div>

        {products.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Products Available</h3>
              <p className="text-gray-400">Be the first to upload some audio content!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors">
                <CardHeader className="p-4">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                      <Music className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                  {product.artist_name && (
                    <p className="text-gray-400 text-sm">by {product.artist_name}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {product.audio_type}
                      </Badge>
                      {product.albums && (
                        <Badge variant="outline" className="text-xs bg-white text-black border-white">
                          {product.albums.name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {product.is_free ? (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            Free
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {product.price?.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(product)}
                        disabled={purchasingId === product.id}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {purchasingId === product.id ? (
                          "Processing..."
                        ) : (
                          <>
                            {product.is_free ? <Download className="w-4 h-4 mr-1" /> : <DollarSign className="w-4 h-4 mr-1" />}
                            {product.is_free ? "Add to Library" : "Buy"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
