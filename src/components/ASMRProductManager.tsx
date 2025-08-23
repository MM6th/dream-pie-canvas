import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Edit, Trash2, Play, DollarSign, Users, Shield } from "lucide-react";
import AudioUploadModal from "@/components/AudioUploadModal";
import EditASMRProductModal from "@/components/EditASMRProductModal";
import DownloadOpportunityChecker from "@/components/DownloadOpportunityChecker";

interface ASMRProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  artist_name: string | null;
  advance_fee_rate: number | null;
  number_of_opportunities: number | null;
  opportunities_exhausted: boolean | null;
  back_end_royalties: boolean | null;
  pie_photo_editing: boolean | null;
  cover_photos: string[] | null;
  access_level: string;
  is_adult_content: boolean | null;
  price: number | null;
  is_free: boolean;
  created_at: string;
}

const ASMRProductManager = () => {
  const [products, setProducts] = useState<ASMRProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ASMRProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select('*')
        .eq('audio_type', 'asmr')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching ASMR products:', error);
      toast({
        title: "Error",
        description: "Failed to load ASMR products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ASMRProduct) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const handleDelete = (product: ASMRProduct) => {
    setSelectedProduct(product);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      const { error } = await supabase
        .from('audio_products')
        .delete()
        .eq('id', selectedProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "ASMR product deleted successfully"
      });

      fetchProducts();
      setDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete ASMR product",
        variant: "destructive"
      });
    }
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Badge variant="outline" className="text-green-400 border-green-400">Public</Badge>;
      case 'merchant_only':
        return <Badge variant="outline" className="text-blue-400 border-blue-400">Merchant Only</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400">Paid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">ASMR Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center">Loading ASMR products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Play className="w-5 h-5" />
            ASMR Products ({products.length})
          </CardTitle>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create ASMR Product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No ASMR products created yet.</p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Create First ASMR Product
            </Button>
          </div>
        ) : (
          <Carousel className="w-full">
            <CarouselContent>
              {products.map((product) => (
                <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="bg-gray-700 border-gray-600 h-full">
                    <CardContent className="p-4 space-y-4">
                      {product.thumbnail_url && (
                        <img
                          src={product.thumbnail_url}
                          alt={product.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      
                      <div className="space-y-2">
                        <h3 className="text-white font-medium truncate">{product.title}</h3>
                        {product.description && (
                          <p className="text-gray-300 text-sm line-clamp-2">{product.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {getAccessLevelBadge(product.access_level)}
                          {product.is_adult_content && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              18+
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          {product.advance_fee_rate && (
                            <div className="flex items-center gap-2 text-green-400">
                              <DollarSign className="w-4 h-4" />
                              <span>Advance: ${product.advance_fee_rate}</span>
                            </div>
                          )}
                          
                          {/* Opportunity Counter with Downloads Tracking */}
                          <DownloadOpportunityChecker
                            audioProductId={product.id}
                            maxDownloads={product.number_of_opportunities}
                            downloadTable="asmr_downloads"
                          >
                            {(remainingDownloads, isExhausted) => (
                              product.number_of_opportunities && (
                                <div className="flex items-center gap-2 text-blue-400">
                                  <Users className="w-4 h-4" />
                                  <span>
                                    Opportunities: {remainingDownloads !== null ? remainingDownloads : product.number_of_opportunities} / {product.number_of_opportunities}
                                  </span>
                                </div>
                              )
                            )}
                          </DownloadOpportunityChecker>
                          
                          {product.back_end_royalties && (
                            <div className="text-purple-400">
                              <span>✓ Back-end Royalties</span>
                            </div>
                          )}
                          {product.pie_photo_editing && (
                            <div className="text-orange-400">
                              <span>✓ PIE Photo Editing</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(product)}
                          className="flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white border-gray-600 hover:bg-gray-700" />
            <CarouselNext className="text-white border-gray-600 hover:bg-gray-700" />
          </Carousel>
        )}

        {/* Create Modal */}
        <AudioUploadModal
          onSuccess={() => {
            fetchProducts();
            setCreateModalOpen(false);
          }}
        />

        {/* Edit Modal */}
        {selectedProduct && (
          <EditASMRProductModal
            product={selectedProduct}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSuccess={() => {
              fetchProducts();
              setEditModalOpen(false);
              setSelectedProduct(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Delete ASMR Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete "{selectedProduct?.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setDeleteModalOpen(false)}
                  variant="outline"
                  className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  variant="destructive"
                >
                  Delete Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ASMRProductManager;