import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Edit, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface VideoProduct {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  thumbnail_url: string | null;
  video_file_url: string;
  is_free: boolean;
  price: number | null;
  created_at: string;
}

const VideoProductManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<VideoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('video_products')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching video products:', error);
      toast({
        title: "Error",
        description: "Failed to load video products",
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
    if (!confirm("Are you sure you want to delete this video product?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('video_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video product deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting video product:', error);
      toast({
        title: "Error",
        description: "Failed to delete video product",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-white">Loading your video products...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Your Video Products</h3>
        <p className="text-gray-400 mb-6">Manage your uploaded video content</p>
      </div>

      {products.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No Video Products</h4>
            <p className="text-gray-400">Upload your first video product to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="p-4">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <CardTitle className="text-white text-base line-clamp-2">{product.title}</CardTitle>
                {product.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {product.video_type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {product.is_free ? (
                        <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                          Free
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 text-xs">
                          <DollarSign className="w-3 h-3" />
                          {product.price?.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {/* TODO: Add edit functionality */}}
                      className="flex-1 bg-black text-white hover:bg-gray-800"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoProductManager;
