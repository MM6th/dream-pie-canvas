
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, FileAudio, Video, DollarSign, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AstrologyProduct {
  id: string;
  product_type: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  delivery_type: string;
  base_price: number;
  hours_selected: number;
  total_price: number;
  buyer_email: string | null;
  created_at: string;
}

const AstrologyStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('astrology_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching astrology products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching astrology products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductTypeLabel = (type: string) => {
    const labels = {
      natal_chart_reading: 'Natal Chart Reading',
      solar_return_reading: 'Solar Return Reading',
      north_node_reading: 'North Node Reading',
      career_path_reading: 'Career Path Reading'
    };
    return labels[type] || type;
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'telephone':
        return <Clock className="w-4 h-4" />;
      case 'audio_file':
        return <FileAudio className="w-4 h-4" />;
      case 'video_file':
        return <Video className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    const labels = {
      telephone: 'Telephone Consultation',
      audio_file: 'Audio File',
      video_file: 'Video File'
    };
    return labels[type] || type;
  };

  const handlePurchase = async (product: AstrologyProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    if (product.delivery_type === 'telephone') {
      // For telephone consultations, show the phone number and instructions
      const phoneNumber = '617-580-2869';
      const confirmed = confirm(
        `For telephone consultation:\n\n` +
        `1. Call ${phoneNumber} (click OK to dial)\n` +
        `2. Leave a voicemail with your callback number if no answer\n` +
        `3. The astrologer will invoice you after purchase\n` +
        `4. Total cost: $${product.total_price} for ${product.hours_selected} hour${product.hours_selected > 1 ? 's' : ''}\n\n` +
        `Click OK to proceed with calling.`
      );
      
      if (confirmed) {
        // Create a clickable phone link
        window.location.href = `tel:${phoneNumber}`;
        
        // Record the purchase intent
        try {
          const { error } = await supabase
            .from('astrology_purchases')
            .insert({
              user_id: user.id,
              astrology_product_id: product.id,
              buyer_email: user.email || '',
              amount_paid: product.total_price,
              delivery_type: product.delivery_type,
              hours_purchased: product.hours_selected,
              status: 'phone_consultation_requested'
            });

          if (error) {
            console.error('Error recording phone consultation request:', error);
          } else {
            toast({
              title: "Phone consultation requested",
              description: "Your request has been recorded. Please call the number provided.",
            });
          }
        } catch (error) {
          console.error('Error recording phone consultation:', error);
        }
      }
      return;
    }

    // For audio/video file purchases, use PayPal with live credentials
    setPurchasingId(product.id);

    try {
      console.log('Starting payment process for astrology product:', product.id);
      
      const { data, error } = await supabase.functions.invoke('create-astrology-payment', {
        body: { 
          astrologyProductId: product.id,
          deliveryType: product.delivery_type,
          totalPrice: product.total_price
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      console.log('Payment response:', data, 'Error:', error);

      if (error) {
        console.error('Payment creation error:', error);
        throw error;
      }

      if (data?.approvalUrl) {
        console.log('Redirecting to PayPal:', data.approvalUrl);
        window.open(data.approvalUrl, '_blank');
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white text-xl">Loading astrology products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Astrology Products Available</h3>
          <p className="text-gray-400">Check back soon for astrology readings and consultations!</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                <Star className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
            <Badge variant="outline" className="w-fit text-xs">
              {getProductTypeLabel(product.product_type)}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {product.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDeliveryTypeIcon(product.delivery_type)}
                  <span className="text-gray-300 text-sm">
                    {getDeliveryTypeLabel(product.delivery_type)}
                  </span>
                </div>
                
                <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {product.total_price}
                  {product.delivery_type === 'telephone' && product.hours_selected > 1 && (
                    <span className="text-xs ml-1">({product.hours_selected}h)</span>
                  )}
                </Badge>
              </div>
              
              <Button
                size="sm"
                onClick={() => handlePurchase(product)}
                disabled={purchasingId === product.id}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {purchasingId === product.id ? (
                  "Processing..."
                ) : (
                  <>
                    {product.delivery_type === 'telephone' ? (
                      <Phone className="w-4 h-4 mr-1" />
                    ) : (
                      <DollarSign className="w-4 h-4 mr-1" />
                    )}
                    {product.delivery_type === 'telephone' ? 'Book Consultation' : 'Purchase'}
                  </>
                )}
              </Button>
              
              {product.delivery_type === 'telephone' && (
                <p className="text-xs text-gray-400 text-center">
                  ${product.base_price}/hour • Click to call for booking
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AstrologyStoreSection;
