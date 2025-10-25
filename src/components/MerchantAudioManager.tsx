import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { AudioLines, Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import EditAudioModal from "./EditAudioModal";
import MerchantAudioUploadModal from "./MerchantAudioUploadModal";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  audio_type: string;
  description: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  album_id: string | null;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  created_at: string;
  albums?: {
    name: string;
  };
}

const MerchantAudioManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AudioProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<AudioProduct | null>(null);

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          audio_type,
          description,
          thumbnail_url,
          audio_file_url,
          album_id,
          is_free,
          price,
          access_level,
          created_at,
          albums (
            name
          )
        `)
        .eq('merchant_id', user.id)
        .eq('audio_type', 'music')
        .eq('access_level', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching music products:', error);
      toast({
        title: "Error",
        description: "Failed to load your music",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this music track?")) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_audio_product_cascade', {
        p_product_id: productId,
        p_merchant_id: user!.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Music track deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete music track",
        variant: "destructive"
      });
    }
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="text-white">Loading your music...</div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Your Music</h3>
            <p className="text-gray-400">Upload and manage your music tracks</p>
          </div>
          <MerchantAudioUploadModal onSuccess={fetchProducts} />
        </div>

        {products.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Music Yet</h4>
              <p className="text-gray-400 mb-4">Upload your first music track to get started!</p>
              <MerchantAudioUploadModal onSuccess={fetchProducts} />
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {products.map((product) => (
                  <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/4">
                    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full">
                      <CardHeader className="p-3">
                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.title}
                            className="w-full h-32 object-fill rounded-lg mb-2"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                            <AudioLines className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <CardTitle className="text-white text-sm line-clamp-2">{product.title}</CardTitle>
                        {product.artist_name && (
                          <p className="text-gray-400 text-xs">by {product.artist_name}</p>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          {product.albums && (
                            <Badge variant="outline" className="text-xs bg-white text-black border-white w-full justify-center">
                              {product.albums.name}
                            </Badge>
                          )}
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                              className="flex-1 bg-black text-white hover:bg-gray-800 text-xs px-2 py-1"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                              className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs px-2 py-1"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -left-4" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -right-4" />
            </Carousel>
          </div>
        )}
      </div>

      {editingProduct && (
        <EditAudioModal
          product={editingProduct}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </>
  );
};

export default MerchantAudioManager;
