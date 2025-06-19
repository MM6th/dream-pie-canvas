import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shirt, Plus, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FashionProductUploadModal from "./FashionProductUploadModal";
import FashionProductSlideshow from "./FashionProductSlideshow";
import EditFashionProductModal from "./EditFashionProductModal";
import EditButton from "./ui/EditButton";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
  shipping_cost: number;
  created_at: string;
  fashion_product_images: Array<{
    id: string;
    image_url: string;
    display_order: number;
  }>;
  fashion_product_variants: Array<{
    id: string;
    size: string;
    color: string;
    stock_quantity: number;
  }>;
}

const FashionProductManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FashionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FashionProduct | null>(null);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowProduct, setSlideshowProduct] = useState<FashionProduct | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('fashion_products')
        .select(`
          *,
          fashion_product_images (*),
          fashion_product_variants (*)
        `)
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
  }, []);

  const handleEdit = (product: FashionProduct) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchProducts();
    setEditModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

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

  const handleImageClick = (product: FashionProduct) => {
    setSlideshowProduct(product);
    setSlideshowOpen(true);
  };

  const getTotalStock = (variants: FashionProduct['fashion_product_variants']) => {
    return variants.reduce((total, variant) => total + variant.stock_quantity, 0);
  };

  const getVariantSummary = (variants: FashionProduct['fashion_product_variants']) => {
    const sizes = [...new Set(variants.map(v => v.size))].sort();
    const colors = [...new Set(variants.map(v => v.color))];
    return { sizes, colors };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading fashion products...</div>
      </div>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shirt className="w-5 h-5" />
              Fashion Products ({products.length})
            </CardTitle>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Shirt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Fashion Products</h3>
              <p className="text-gray-400 mb-4">Upload your first fashion product to get started</p>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const totalStock = getTotalStock(product.fashion_product_variants);
                const { sizes, colors } = getVariantSummary(product.fashion_product_variants);
                
                return (
                  <Card key={product.id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Product Images */}
                        {product.fashion_product_images.length > 0 ? (
                          <img
                            src={product.fashion_product_images[0].image_url}
                            alt={product.title}
                            className="w-full h-48 object-fill rounded-lg cursor-pointer"
                            onClick={() => handleImageClick(product)}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-600 rounded-lg flex items-center justify-center">
                            <Shirt className="w-12 h-12 text-gray-400" />
                          </div>
                        )}

                        {/* Product Info */}
                        <div>
                          <h3 className="text-lg font-semibold text-white line-clamp-2">{product.title}</h3>
                          {product.description && (
                            <p className="text-gray-400 text-sm line-clamp-2 mt-1">{product.description}</p>
                          )}
                          {product.materials && (
                            <p className="text-gray-300 text-xs mt-1">Materials: {product.materials}</p>
                          )}
                        </div>

                        {/* Price and Stock */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-white">${product.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-400">
                              + ${product.shipping_cost.toFixed(2)} shipping
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={totalStock > 0 ? "default" : "destructive"} className="mb-1">
                              <Package className="w-3 h-3 mr-1" />
                              {totalStock} in stock
                            </Badge>
                          </div>
                        </div>

                        {/* Variants Summary */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-400">Sizes:</span>
                            {sizes.map(size => (
                              <Badge key={size} variant="outline" className="text-xs">
                                {size}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-400">Colors:</span>
                            {colors.map(color => (
                              <Badge key={color} variant="outline" className="text-xs capitalize">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <EditButton
                            onClick={() => handleEdit(product)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(product.id)}
                            className="border-red-500 text-red-400 bg-black hover:bg-gray-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FashionProductUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchProducts}
      />

      <EditFashionProductModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={handleEditSuccess}
      />

      {slideshowProduct && (
        <FashionProductSlideshow
          images={slideshowProduct.fashion_product_images}
          productTitle={slideshowProduct.title}
          isOpen={slideshowOpen}
          onClose={() => {
            setSlideshowOpen(false);
            setSlideshowProduct(null);
          }}
        />
      )}
    </>
  );
};

export default FashionProductManager;
