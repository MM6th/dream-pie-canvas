import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChefHat, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FoodProductUploadModal from "./FoodProductUploadModal";
import EditFoodProductModal from "./EditFoodProductModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FoodProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  created_at: string;
  food_product_images: {
    id: string;
    image_url: string;
    media_type: string;
    display_order: number;
  }[];
}

const FoodProductManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<FoodProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<FoodProduct | null>(null);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('food_products')
        .select(`
          id,
          title,
          description,
          price,
          status,
          created_at,
          food_product_images (
            id,
            image_url,
            media_type,
            display_order
          )
        `)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load your products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleDeleteClick = (product: FoodProduct) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete || !user) return;

    setDeletingId(productToDelete.id);

    try {
      // Delete images from storage first
      for (const image of productToDelete.food_product_images) {
        // Extract path from URL
        const urlParts = image.image_url.split('/food-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('food-images')
            .remove([urlParts[1]]);
        }
      }

      // Delete product (cascade will handle food_product_images)
      const { error } = await supabase
        .from('food_products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('merchant_id', user.id);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: "Your product has been removed from the store"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  const getFirstImage = (product: FoodProduct) => {
    const sortedImages = [...product.food_product_images].sort((a, b) => a.display_order - b.display_order);
    return sortedImages[0];
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-white">Loading products...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-500" />
            My Food Products
          </CardTitle>
          <FoodProductUploadModal onSuccess={fetchProducts} />
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4">
            PIE receives a 10% platform fee on all product sales. You receive 90%. Payouts available at $100 threshold.
          </p>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <ChefHat className="w-12 h-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400">No products uploaded yet</p>
              <p className="text-gray-500 text-sm">Click "Upload New Product" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const firstImage = getFirstImage(product);
                return (
                  <Card key={product.id} className="bg-gray-700/50 border-gray-600">
                    <div className="relative">
                      {firstImage ? (
                        firstImage.media_type === 'video' ? (
                          <video
                            src={firstImage.image_url}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        ) : (
                          <img
                            src={firstImage.image_url}
                            alt={product.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        )
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-orange-600 to-red-600 rounded-t-lg flex items-center justify-center">
                          <ChefHat className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-600">
                        ${product.price.toFixed(2)}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-2 line-clamp-1">{product.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{product.description}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(product)}
                          className="flex-1"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(product)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete "{productToDelete?.title}" from the store. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      {editingProduct && (
        <EditFoodProductModal
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </>
  );
};

export default FoodProductManager;
