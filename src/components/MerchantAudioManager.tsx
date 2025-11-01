import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { AudioLines, Edit, Trash2, Album } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import EditAudioModal from "./EditAudioModal";
import MerchantAudioUploadModal from "./MerchantAudioUploadModal";

interface AudioProduct {
  id: string;
  type: 'single' | 'album';
  title?: string;
  name?: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  status: string;
  published_at?: string;
  created_at: string;
  tracks?: any[];
  albums?: {
    id: string;
    name: string;
  };
}

const MerchantAudioManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AudioProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data: audioProducts, error } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          thumbnail_url,
          album_id,
          status,
          published_at,
          created_at,
          albums (
            id,
            name
          )
        `)
        .eq('merchant_id', user.id)
        .eq('audio_type', 'music')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by albums
      const albumMap = new Map();
      const singles: AudioProduct[] = [];
      
      (audioProducts || []).forEach(product => {
        if (product.album_id) {
          if (!albumMap.has(product.album_id)) {
            albumMap.set(product.album_id, {
              id: product.album_id,
              type: 'album' as const,
              name: product.albums?.name,
              artist_name: product.artist_name,
              thumbnail_url: product.thumbnail_url,
              tracks: [],
              status: product.status,
              published_at: product.published_at,
              created_at: product.created_at,
            });
          }
          albumMap.get(product.album_id).tracks.push(product);
        } else {
          singles.push({
            ...product,
            type: 'single' as const,
          });
        }
      });
      
      const albums = Array.from(albumMap.values());
      const allProducts = [...albums, ...singles];
      setProducts(allProducts);
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

  const handleDelete = async (product: AudioProduct) => {
    if (product.status === 'published') {
      toast({
        title: "Cannot Delete",
        description: "Published music cannot be deleted. Contact administration for assistance.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
      return;
    }

    try {
      if (product.type === 'album') {
        const trackIds = product.tracks?.map(t => t.id) || [];
        for (const trackId of trackIds) {
          const { error } = await supabase
            .from('audio_products')
            .delete()
            .eq('id', trackId);
          
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('audio_products')
          .delete()
          .eq('id', product.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Music deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete music",
        variant: "destructive"
      });
    }
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    fetchProducts();
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'published') return p.status === 'published';
    if (filter === 'drafts') return p.status === 'draft';
    return true;
  });

  const draftCount = products.filter(p => p.status === 'draft').length;
  const publishedCount = products.filter(p => p.status === 'published').length;

  if (loading) {
    return (
      <div className="text-white">Loading your music...</div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">No Music Yet</h4>
          <p className="text-gray-400 mb-4">Upload your first music track to get started!</p>
          <MerchantAudioUploadModal onSuccess={fetchProducts} />
        </CardContent>
      </Card>
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

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="all">All Music ({products.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({draftCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {filteredProducts.map((product) => (
                <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/4">
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full">
                    <CardHeader className="p-3">
                      {product.thumbnail_url ? (
                        <img
                          src={product.thumbnail_url}
                          alt={product.type === 'album' ? product.name : product.title}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                          {product.type === 'album' ? (
                            <Album className="w-6 h-6 text-gray-400" />
                          ) : (
                            <AudioLines className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-white text-sm line-clamp-2">
                            {product.type === 'album' ? product.name : product.title}
                          </CardTitle>
                          {product.artist_name && (
                            <p className="text-gray-400 text-xs">by {product.artist_name}</p>
                          )}
                        </div>
                        <Badge variant={product.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {product.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-2">
                        {product.type === 'album' && (
                          <p className="text-xs text-gray-400">
                            {product.tracks?.length} tracks
                          </p>
                        )}

                        {product.published_at && (
                          <p className="text-xs text-gray-400">
                            Published {new Date(product.published_at).toLocaleDateString()}
                          </p>
                        )}
                        
                        {product.status === 'draft' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                const trackToEdit = product.type === 'album' ? product.tracks?.[0] : product;
                                setEditingProduct(trackToEdit);
                              }}
                              className="flex-1 bg-black text-white hover:bg-gray-800 text-xs px-2 py-1"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product)}
                              className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs px-2 py-1"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
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