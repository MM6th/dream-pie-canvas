import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Download, DollarSign, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string;
  price: number | null;
  audio_file_url: string;
  thumbnail_url: string;
  is_free?: boolean;
  access_level?: string;
}

interface SongDetailModalProps {
  audioProduct: AudioProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStore: () => void;
}

export default function SongDetailModal({ audioProduct, isOpen, onClose, onNavigateToStore }: SongDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  React.useEffect(() => {
    if (audioProduct && user) {
      checkIfAlreadyOwned();
    }
  }, [audioProduct, user]);

  const checkIfAlreadyOwned = async () => {
    if (!audioProduct || !user) return;

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('audio_product_id', audioProduct.id)
        .maybeSingle();

      if (error) throw error;
      setAlreadyOwned(!!data);
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  };

  const handleDownload = async () => {
    if (!audioProduct || !user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download audio",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: insertedPurchase, error: insertError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          audio_product_id: audioProduct.id,
          is_free_download: true,
          amount_paid: 0,
          paypal_transaction_id: null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Audio added to library!",
        description: "The audio has been added to your audio player in the dashboard",
      });

      setAlreadyOwned(true);
      onClose();
    } catch (error: any) {
      console.error('Error downloading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add audio to your library. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!audioProduct || !user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-payment', {
        body: { audioProductId: audioProduct.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.approvalUrl) {
        window.open(data.approvalUrl, '_blank');
        onClose();
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
      setLoading(false);
    }
  };

  const isFree = audioProduct?.is_free !== false && (audioProduct?.price === null || audioProduct?.price === 0);

  if (!audioProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="h-5 w-5" />
            Now Playing
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {audioProduct.thumbnail_url && (
            <div className="w-full h-48 overflow-hidden rounded-lg">
              <img
                src={audioProduct.thumbnail_url}
                alt={audioProduct.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{audioProduct.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <User className="h-4 w-4" />
              {audioProduct.artist_name}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <Badge variant="secondary" className="bg-green-900/30 text-green-300">
                {isFree ? 'Free' : `$${audioProduct.price?.toFixed(2)}`}
              </Badge>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              You heard a 30-second preview. {isFree ? 'Download the full track for free!' : 'Purchase the full track and support the artist!'}
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            {alreadyOwned ? (
              <Button 
                disabled
                className="flex-1 bg-gray-600 text-gray-300 cursor-not-allowed"
              >
                Already in Library
              </Button>
            ) : isFree ? (
              <Button 
                onClick={handleDownload}
                disabled={loading || !user}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {!user ? 'Sign In Required' : 'Download'}
              </Button>
            ) : (
              <Button 
                onClick={handlePurchase}
                disabled={loading || !user}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                {!user ? 'Sign In Required' : 'Buy Now'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}