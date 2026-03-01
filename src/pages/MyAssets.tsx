import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Image, TrendingUp, TrendingDown, History } from "lucide-react";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpotPrice } from "@/hooks/useSpotPrice";
import NFTDetailModal from "@/components/NFTDetailModal";

const MyAssets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { spotPrice, isLoading: priceLoading } = useSpotPrice();
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatTransactionLabel = (type: string) => {
    switch (type) {
      case 'credit_purchase': return 'Token Purchase';
      case 'token_buy_tax': return 'Buy Tax';
      case 'nft_mint': return 'NFT Minted';
      default: return type.replace(/_/g, ' ');
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchAssets = async () => {
      setLoading(true);
      
      const [balanceRes, nftsRes, txRes] = await Promise.all([
        supabase.from('token_balances').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('audio_nfts').select('*').eq('owner_id', user.id).order('minted_at', { ascending: false }),
        supabase.from('platform_revenue').select('*').eq('source_user_id', user.id).in('revenue_type', ['credit_purchase', 'token_buy_tax']).order('created_at', { ascending: false }).limit(20)
      ]);

      setTokenBalance(balanceRes.data);
      setNfts(nftsRes.data || []);

      // Combine platform revenue transactions with NFT mint events
      const revenueTx = (txRes.data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.revenue_type,
        amount: tx.amount,
        date: tx.created_at,
      }));

      const nftMintTx = (nftsRes.data || []).map((nft: any) => ({
        id: `nft-${nft.id}`,
        type: 'nft_mint',
        amount: nft.sixth_value_at_mint,
        date: nft.minted_at,
        label: (nft.metadata as any)?.title || 'Audio NFT',
      }));

      const combined = [...revenueTx, ...nftMintTx]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

      setTransactions(combined);
      setLoading(false);
    };

    fetchAssets();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Please log in to view your assets.</p>
      </div>
    );
  }

  const balance = tokenBalance?.balance || 0;
  const totalUsdValue = balance * spotPrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            My Assets
          </h1>
        </div>

        {/* Token Holdings */}
        <Card className="bg-gradient-to-br from-amber-900/20 to-gray-800/50 border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <img src={sixthCoinLogo} alt="SIXTH" className="w-5 h-5 rounded-full" />
              SIXTH Token Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Balance</p>
                <p className="text-2xl font-bold font-mono text-white">{balance.toLocaleString()}</p>
                <p className="text-xs text-gray-500">SIXTH tokens</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Spot Price</p>
                <p className="text-2xl font-bold font-mono text-white">
                  {priceLoading ? '...' : `$${spotPrice.toFixed(6)}`}
                </p>
                <p className="text-xs text-gray-500">per SIXTH</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold font-mono text-amber-400">${totalUsdValue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">USD equivalent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NFT Collection */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Image className="w-5 h-5 text-amber-400" />
              NFT Collection
              <Badge variant="outline" className="ml-2 border-gray-600 text-gray-300">{nfts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400 text-center py-8">Loading assets...</p>
            ) : nfts.length === 0 ? (
              <div className="text-center py-8">
                <Image className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No NFTs yet</p>
                <p className="text-gray-500 text-sm">Upload audio content with a thumbnail to mint your first NFT</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((nft) => {
                  const meta = nft.metadata as any;
                  const mintPrice = nft.sixth_value_at_mint || 0.00001;
                  const changePercent = mintPrice > 0 ? ((spotPrice - mintPrice) / mintPrice) * 100 : 0;
                  const isPositive = changePercent >= 0;

                  return (
                    <div
                      key={nft.id}
                      onClick={() => setSelectedNft(nft)}
                      className="cursor-pointer group bg-gray-900/50 rounded-xl border border-gray-700 hover:border-amber-500/40 transition-all overflow-hidden"
                    >
                      {meta?.thumbnail_url ? (
                        <img src={meta.thumbnail_url} alt={meta.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full aspect-square bg-gray-700 flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <p className="text-white text-sm font-medium truncate">{meta?.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 text-xs font-mono">#{nft.token_id}</span>
                          <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-amber-400" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-700/50">
                    <div>
                      <p className="text-white text-sm">{formatTransactionLabel(tx.type)}</p>
                      {tx.label && <p className="text-gray-400 text-xs">{tx.label}</p>}
                      <p className="text-gray-500 text-xs">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-mono text-sm ${tx.type === 'nft_mint' ? 'text-green-400' : 'text-amber-400'}`}>
                      {tx.type === 'nft_mint' ? `${tx.amount?.toFixed(6)} SIXTH` : `$${tx.amount?.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NFT Detail Modal */}
      <NFTDetailModal
        isOpen={!!selectedNft}
        onClose={() => setSelectedNft(null)}
        nft={selectedNft}
      />
    </div>
  );
};

export default MyAssets;
