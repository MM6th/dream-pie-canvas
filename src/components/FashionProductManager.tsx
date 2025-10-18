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
import { Shirt, Edit, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import EditFashionProductModal from "./EditFashionProductModal";

type FashionProductWithRelations = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  shipping_cost: number;
  tax_rate: number;
  materials: string | null;
  admin_id: string;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  created_at: string;
  updated_at: string;
  fashion_product_images?: { id: string; image_url: string; display_order: number }[];
  fashion_product_variants?: { id: string; size: string; color: string; stock_quantity: number }[];
};

const FashionProductManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FashionProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<FashionProductWithRelations | null>(null);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fashion_products')
        .select(`
          *,
          fashion_product_images (
            id,
            image_url,
            display_order
          ),
          fashion_product_variants (
            id,
            size,
            color,
            stock_quantity
          )
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching fashion products:', error);
      toast({
        title: "Error",
        description: "Failed to load fashion products",
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
    if (!confirm("Are you sure you want to delete this fashion product?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fashion_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fashion product deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting fashion product:', error);
      toast({
        title: "Error",
        description: "Failed to delete fashion product",
        variant: "destructive"
      });
    }
  };

  const convertToEditFormat = (product: FashionProductWithRelations) => {
    return {
      ...product,
      fashion_product_images: product.fashion_product_images || [],
      fashion_product_variants: product.fashion_product_variants || []
    };
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="text-white">Loading your fashion products...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Your Fashion Products</h3>
        <p className="text-gray-400 mb-6">Manage your fashion product listings</p>
      </div>

      {products.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Shirt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No Fashion Products</h4>
            <p className="text-gray-400">Create your first fashion product to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {products.map((product) => (
                <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full">
                     <CardHeader className="p-4">
                       {product.fashion_product_images && product.fashion_product_images.length > 0 ? (
                         <img
                           src={product.fashion_product_images.sort((a, b) => a.display_order - b.display_order)[0].image_url}
                           alt={product.title}
                           className="w-full h-48 object-cover rounded-lg mb-3"
                         />
                       ) : (
                         <div className="w-full h-48 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                           <Shirt className="w-8 h-8 text-gray-400" />
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
                             {product.materials || 'Fashion'}
                           </Badge>
                           <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1 text-xs">
                             <DollarSign className="w-3 h-3" />
                             {product.price.toFixed(2)}
                           </Badge>
                         </div>
                         
                         {product.fashion_product_variants && product.fashion_product_variants.length > 0 && (
                           <div className="space-y-1">
                             {product.fashion_product_variants.some(v => v.size) && (
                               <div className="text-xs text-gray-300">
                                 <strong>Sizes:</strong> {[...new Set(product.fashion_product_variants.map(v => v.size))].join(', ')}
                               </div>
                             )}
                             {product.fashion_product_variants.some(v => v.color) && (
                               <div className="text-xs text-gray-300">
                                 <strong>Colors:</strong> {[...new Set(product.fashion_product_variants.map(v => v.color))].join(', ')}
                               </div>
                             )}
                           </div>
                         )}
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingProduct(product)}
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
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -left-4" />
            <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -right-4" />
          </Carousel>
        </div>
      )}

      {editingProduct && (
        <EditFashionProductModal
          product={convertToEditFormat(editingProduct)}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default FashionProductManager;
