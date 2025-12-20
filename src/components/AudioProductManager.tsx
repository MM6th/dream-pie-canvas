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
import { AudioLines, Edit, Trash2, DollarSign, Lock, Album } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import EditAudioModal from "./EditAudioModal";
import EditAlbumModal from "./EditAlbumModal";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";

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
  audio_type: string | null;
}

interface SingleProduct {
  id: string;
  type: 'single';
  title: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  audio_type: string;
  album_id: null;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  status: string;
  published_at: string | null;
  created_at: string;
  hasSignedContract?: boolean;
}

type AudioProduct = AlbumProduct | SingleProduct;

const AudioProductManager = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminStatusLoading } = useApprovalStatus();
  const [products, setProducts] = useState<AudioProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAlbum, setEditingAlbum] = useState<AlbumProduct | null>(null);
  const [editingSingle, setEditingSingle] = useState<SingleProduct | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

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
          created_at,
          audio_type
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

      // Fetch singles (audio_products without album_id) - exclude ASMR with submissions
      const { data: singlesData, error: singlesError } = await supabase
        .from('audio_products')
        .select(`
          id,
          title,
          artist_name,
          audio_type,
          thumbnail_url,
          audio_file_url,
          is_free,
          price,
          access_level,
          is_adult_content,
          status,
          published_at,
          created_at
        `)
        .eq('merchant_id', user.id)
        .is('album_id', null)
        .order('created_at', { ascending: false });

      if (singlesError) throw singlesError;

      // Filter out ASMR products that have submissions
      const { data: asmrSubmissions } = await supabase
        .from('asmr_submissions')
        .select('audio_product_id')
        .in('audio_product_id', (singlesData || []).map(p => p.id));

      const asmrProductIds = new Set(asmrSubmissions?.map(s => s.audio_product_id) || []);
      const filteredSingles = (singlesData || []).filter(p => !asmrProductIds.has(p.id));

      // Check for signed contracts for singles
      const singlesWithContractStatus: SingleProduct[] = await Promise.all(
        filteredSingles.map(async (product) => {
          let hasSignedContract = false;
          
          const { data: podcastDownloads } = await supabase
            .from('podcast_downloads')
            .select(`
              contract_id,
              contracts!inner (
                status,
                signed_at
              )
            `)
            .eq('audio_product_id', product.id)
            .eq('contracts.status', 'approved')
            .not('contracts.signed_at', 'is', null);
          
          if (podcastDownloads && podcastDownloads.length > 0) {
            hasSignedContract = true;
          }
          
          if (!hasSignedContract) {
            const { data: asmrDownloads } = await supabase
              .from('asmr_downloads')
              .select(`
                contract_id,
                contracts!inner (
                  status,
                  signed_at
                )
              `)
              .eq('audio_product_id', product.id)
              .eq('contracts.status', 'approved')
              .not('contracts.signed_at', 'is', null);
            
            if (asmrDownloads && asmrDownloads.length > 0) {
              hasSignedContract = true;
            }
          }
          
          return { 
            ...product, 
            type: 'single' as const,
            album_id: null,
            hasSignedContract 
          };
        })
      );

      // Combine and sort by created_at
      const allProducts = [...albumsWithTracks, ...singlesWithContractStatus].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setProducts(allProducts);
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
    if (!adminStatusLoading) {
      if (isAdmin) {
        fetchProducts();
      } else {
        setLoading(false);
      }
    }
  }, [user, isAdmin, adminStatusLoading]);

  const handleDeleteAlbum = async (album: AlbumProduct) => {
    if (album.status === 'published') {
      toast({
        title: "Cannot Delete",
        description: "Published albums cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this album and all its tracks?")) {
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
    if (single.hasSignedContract) {
      toast({
        title: "Cannot Delete",
        description: "This product has signed contracts.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this audio product?")) {
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
        description: "Audio product deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const handleEditSuccess = () => {
    setEditingAlbum(null);
    setEditingSingle(null);
    fetchProducts();
  };

  const getDisplayName = (product: AudioProduct) => {
    return product.type === 'album' ? product.name : product.title;
  };

  const getAccessBadge = (product: AudioProduct) => {
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

  const isLocked = (product: AudioProduct) => {
    if (product.type === 'album') {
      return product.status === 'published';
    }
    return product.hasSignedContract || product.status === 'published';
  };

  if (adminStatusLoading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-white">Loading your audio products...</div>
    );
  }

  const filteredProducts = products.filter(p => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'published') return p.status === 'published';
    if (filterStatus === 'draft') return p.status === 'draft' || !p.status;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Your Audio Products</h3>
          <p className="text-gray-400 mb-2">Manage your uploaded audio content</p>
          <p className="text-gray-500 text-sm mb-4">
            PIE receives a 10% platform fee on all audio sales. You receive 90%. Payouts available at $100 threshold.
          </p>
          
          <div className="flex gap-2 mb-6">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              size="sm"
            >
              All ({products.length})
            </Button>
            <Button
              variant={filterStatus === 'published' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('published')}
              size="sm"
            >
              Published ({products.filter(p => p.status === 'published').length})
            </Button>
            <Button
              variant={filterStatus === 'draft' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('draft')}
              size="sm"
            >
              Drafts ({products.filter(p => p.status === 'draft' || !p.status).length})
            </Button>
          </div>
        </div>

        {products.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <AudioLines className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Audio Products</h4>
              <p className="text-gray-400">Upload your first audio product to get started!</p>
            </CardContent>
          </Card>
        ) : (
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
                            className="w-full h-32 object-fill rounded-lg mb-2"
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
                        <CardTitle className="text-white text-sm line-clamp-2">{getDisplayName(product)}</CardTitle>
                        {product.type === 'album' && (
                          <p className="text-gray-400 text-xs">{product.tracks.length} tracks</p>
                        )}
                        {product.type === 'single' && product.artist_name && (
                          <p className="text-gray-400 text-xs">by {product.artist_name}</p>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {product.type === 'album' ? (product.audio_type || 'Album') : product.audio_type}
                            </Badge>
                            {product.status === 'draft' || !product.status ? (
                              <Badge variant="outline" className="text-xs bg-yellow-600 text-white border-yellow-600">
                                Draft
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600">
                                Published
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-center">
                            {getAccessBadge(product)}
                          </div>
                          
                          {isLocked(product) ? (
                            <div className="flex items-center justify-center gap-2 p-2 bg-blue-600/20 border border-blue-600 rounded-md">
                              <Lock className="w-4 h-4 text-blue-400" />
                              <span className="text-sm text-blue-400 font-medium">
                                {product.type === 'single' && product.hasSignedContract ? 'Contract Signed' : 'Published - Locked'}
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
        )}
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
            albums: undefined,
          }}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingSingle(null)}
        />
      )}
    </>
  );
};

export default AudioProductManager;
