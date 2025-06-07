
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select(`
          *,
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

  const handleDownload = (product: AudioProduct) => {
    if (product.audio_file_url) {
      const link = document.createElement('a');
      link.href = product.audio_file_url;
      link.download = product.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {product.audio_type}
                      </Badge>
                      {product.albums && (
                        <Badge variant="outline" className="text-xs">
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
                        onClick={() => handleDownload(product)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {product.is_free ? "Download" : "Buy"}
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
