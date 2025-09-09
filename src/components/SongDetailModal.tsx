import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ShoppingCart, User, DollarSign } from 'lucide-react';

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string;
  price: number;
  audio_file_url: string;
  thumbnail_url: string;
}

interface SongDetailModalProps {
  audioProduct: AudioProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStore: () => void;
}

export default function SongDetailModal({ audioProduct, isOpen, onClose, onNavigateToStore }: SongDetailModalProps) {
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
                ${audioProduct.price?.toFixed(2) || 'Free'}
              </Badge>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              You heard a 30-second preview. Want to purchase the full track and support the artist?
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={onNavigateToStore}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Visit Store
            </Button>
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