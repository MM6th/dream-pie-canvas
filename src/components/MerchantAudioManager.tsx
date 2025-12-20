import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { AudioLines, Edit, Trash2, Album, DollarSign, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import EditAudioModal from "./EditAudioModal";
import EditAlbumModal from "./EditAlbumModal";
import MerchantAudioUploadModal from "./MerchantAudioUploadModal";

interface AlbumProduct {
  id: string;
  type: 'album';
  name: string;
  thumbnail_url: string | null;
  status: string;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  published_at: string | null;
  created_at: string;
  tracks: any[];
}

interface SingleProduct {
  id: string;
  type: 'single';
  title: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  status: string;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  published_at: string | null;
  created_at: string;
  audio_file_url: string;
  audio_type: string;
}

type MusicProduct = AlbumProduct | SingleProduct;

const MerchantAudioManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<MusicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAlbum, setEditingAlbum] = useState<AlbumProduct | null>(null);
  const [editingSingle, setEditingSingle] = useState<SingleProduct | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      // Fetch albums with their tracks
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select(`
          id,
          name,
          thumbnail_url,
          status,
          is_free,
          price,
          access_level,
          is_adult_content,
          published_at,
          created_at
        `)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (albumsError) throw albumsError;

      // Fetch tracks for each album
      const albumsWithTracks: AlbumProduct[] = await Promise.all(
        (albumsData || []).map(async (album) => {
          const { data: tracks } = await supabase
            .from('audio_products')
            .select('id, title, artist_name, audio_file_url')
            .eq('album_id', album.id)
            .order('created_at', { ascending: true });

          return {
            ...album,
            type: 'album' as const,
            tracks: tracks || [],
          };
        })
      );

      // Fetch singles (audio_products without album_id)
      const { data: singlesData, error: singlesError } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          thumbnail_url,
          status,
          is_free,
          price,
          access_level,
          is_adult_content,
          published_at,
          created_at,
          audio_file_url,
          audio_type
        `)
        .eq('merchant_id', user.id)
        .eq('audio_type', 'music')
        .is('album_id', null)
        .order('created_at', { ascending: false });

      if (singlesError) throw singlesError;

      const singles: SingleProduct[] = (singlesData || []).map(s => ({
        ...s,
        type: 'single' as const,
      }));

      // Combine and sort by created_at
      const allProducts = [...albumsWithTracks, ...singles].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

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

  const handleDeleteAlbum = async (album: AlbumProduct) => {
    if (album.status === 'published') {
      toast({
        title: "Cannot Delete",
        description: "Published albums cannot be deleted. Contact administration for assistance.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this album and all its tracks? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_album_cascade', {
        p_album_id: album.id,
        p_merchant_id: user!.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Album deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting album:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete album",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSingle = async (single: SingleProduct) => {
    if (single.status === 'published') {
      toast({
        title: "Cannot Delete",
        description: "Published music cannot be deleted. Contact administration for assistance.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this track? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_audio_product_cascade', {
        p_product_id: single.id,
        p_merchant_id: user!.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Track deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete track",
        variant: "destructive"
      });
    }
  };

  const handleEditSuccess = () => {
    setEditingAlbum(null);
    setEditingSingle(null);
    fetchProducts();
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'published') return p.status === 'published';
    if (filter === 'drafts') return p.status === 'draft';
    return true;
  });

  const draftCount = products.filter(p => p.status === 'draft').length;
  const publishedCount = products.filter(p => p.status === 'published').length;

  const getDisplayName = (product: MusicProduct) => {
    return product.type === 'album' ? product.name : product.title;
  };

  const getAccessBadge = (product: MusicProduct) => {
    const accessLevel = product.access_level || (product.is_free ? "public" : "paid");
    switch (accessLevel) {
      case "public":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
            Free
          </Badge>
        );
      case "merchant_only":
        return (
          <Badge className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1 text-xs">
            <Lock className="w-3 h-3" />
            Merchants Only
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 text-xs">
            <DollarSign className="w-3 h-3" />
            {product.price?.toFixed(2)}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
            Free
          </Badge>
        );
    }
  };

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
            <p className="text-gray-400">Upload and manage your music albums and singles</p>
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
                          alt={getDisplayName(product)}
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
                            {getDisplayName(product)}
                          </CardTitle>
                          {product.type === 'album' && (
                            <p className="text-gray-400 text-xs">{product.tracks.length} tracks</p>
                          )}
                          {product.type === 'single' && product.artist_name && (
                            <p className="text-gray-400 text-xs">by {product.artist_name}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {product.type === 'album' ? 'Album' : 'Single'}
                          </Badge>
                          <Badge 
                            variant={product.status === 'published' ? 'default' : 'secondary'} 
                            className={product.status === 'published' ? 'bg-green-600' : 'bg-yellow-600'}
                          >
                            {product.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>

                        <div className="flex justify-center">
                          {getAccessBadge(product)}
                        </div>

                        {product.status === 'published' ? (
                          <div className="flex items-center justify-center gap-2 p-2 bg-blue-600/20 border border-blue-600 rounded-md">
                            <Lock className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-400 font-medium">
                              Published - Locked
                            </span>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (product.type === 'album') {
                                  setEditingAlbum(product);
                                } else {
                                  setEditingSingle(product);
                                }
                              }}
                              className="flex-1 bg-black text-white hover:bg-gray-800 text-xs px-2 py-1"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (product.type === 'album') {
                                  handleDeleteAlbum(product);
                                } else {
                                  handleDeleteSingle(product);
                                }
                              }}
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

      {editingAlbum && (
        <EditAlbumModal
          album={editingAlbum}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingAlbum(null)}
        />
      )}

      {editingSingle && (
        <EditAudioModal
          product={{
            ...editingSingle,
            album_id: null,
            albums: undefined,
          }}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingSingle(null)}
        />
      )}
    </>
  );
};

export default MerchantAudioManager;
