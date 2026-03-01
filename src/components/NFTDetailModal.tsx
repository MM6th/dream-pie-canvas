import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AudioLines, Calendar, User, TrendingUp, TrendingDown } from "lucide-react";
import { useSpotPrice } from "@/hooks/useSpotPrice";

interface NFTData {
  id: string;
  token_id: number;
  audio_product_id: string;
  owner_id: string;
  minted_by: string;
  minted_at: string;
  sixth_value_at_mint: number;
  metadata: {
    title: string;
    artist: string;
    thumbnail_url: string;
    audio_type: string;
  };
}

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFTData | null;
}

const NFTDetailModal = ({ isOpen, onClose, nft }: NFTDetailModalProps) => {
  const { spotPrice } = useSpotPrice();

  if (!nft) return null;

  const mintPrice = nft.sixth_value_at_mint || 0.00001;
  const currentValueSixth = mintPrice > 0 ? (spotPrice / mintPrice) : 0;
  const valueAtMintSixth = 1;
  const gainLoss = currentValueSixth - valueAtMintSixth;
  const gainLossPercent = valueAtMintSixth > 0 ? (gainLoss / valueAtMintSixth) * 100 : 0;
  const isPositive = gainLoss >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 text-white border-amber-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AudioLines className="w-5 h-5" />
            SIXTH-NFT #{nft.token_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thumbnail */}
          {nft.metadata.thumbnail_url ? (
            <div className="relative rounded-xl overflow-hidden border border-amber-500/20">
              <img
                src={nft.metadata.thumbnail_url}
                alt={nft.metadata.title}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge className="bg-amber-500/90 text-black font-mono text-xs">
                  #{nft.token_id}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-700 rounded-xl flex items-center justify-center">
              <AudioLines className="w-16 h-16 text-gray-500" />
            </div>
          )}

          {/* Info */}
          <div>
            <h3 className="text-lg font-bold text-white">{nft.metadata.title}</h3>
            <p className="text-gray-400 text-sm">{nft.metadata.artist || 'Unknown Artist'}</p>
            <Badge variant="outline" className="mt-1 text-xs capitalize border-gray-600 text-gray-300">
              {nft.metadata.audio_type}
            </Badge>
          </div>

          {/* Value Comparison */}
          <div className="bg-gray-800/60 rounded-lg p-4 space-y-3 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Spot Price at Mint</span>
              <span className="text-white font-mono text-sm">${mintPrice.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Current Spot Price</span>
              <span className="text-white font-mono text-sm">${spotPrice.toFixed(6)}</span>
            </div>
            <div className="border-t border-gray-600 pt-2 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Value Change</span>
              <span className={`font-mono text-sm flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Minted: {new Date(nft.minted_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <User className="w-4 h-4" />
              <span className="truncate">Owner: {nft.owner_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NFTDetailModal;
