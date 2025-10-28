import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface PurchasedContent {
  id: string;
  title: string;
  type: 'audio' | 'video' | 'portfolio' | 'fashion' | 'astrology';
  internalLink: string;
}

interface PurchasedContentPickerProps {
  onSelectContent: (link: string, title: string) => void;
  selectedLink?: string;
}

export default function PurchasedContentPicker({ onSelectContent, selectedLink }: PurchasedContentPickerProps) {
  const [open, setOpen] = useState(false);
  const [purchasedContent, setPurchasedContent] = useState<PurchasedContent[]>([]);
  const [filteredContent, setFilteredContent] = useState<PurchasedContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPurchasedContent();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredContent(
        purchasedContent.filter(item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredContent(purchasedContent);
    }
  }, [searchTerm, purchasedContent]);

  const fetchPurchasedContent = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const content: PurchasedContent[] = [];

      // Fetch audio purchases
      const { data: audioPurchases } = await supabase
        .from('user_purchases')
        .select('audio_product_id, audio_products(id, title)')
        .eq('user_id', user.id);

      if (audioPurchases) {
        audioPurchases.forEach(purchase => {
          if (purchase.audio_products) {
            content.push({
              id: purchase.audio_products.id,
              title: purchase.audio_products.title,
              type: 'audio',
              internalLink: `/store?product=audio&id=${purchase.audio_products.id}`
            });
          }
        });
      }

      // Fetch portfolio purchases
      const { data: portfolioPurchases } = await supabase
        .from('portfolio_purchases')
        .select('portfolio_id, portfolios(id, title)')
        .eq('user_id', user.id);

      if (portfolioPurchases) {
        portfolioPurchases.forEach(purchase => {
          if (purchase.portfolios) {
            content.push({
              id: purchase.portfolios.id,
              title: purchase.portfolios.title,
              type: 'portfolio',
              internalLink: `/profiles?portfolio=${purchase.portfolios.id}`
            });
          }
        });
      }

      // Fetch fashion purchases
      const { data: fashionPurchases } = await supabase
        .from('fashion_purchases')
        .select('fashion_product_id, fashion_products(id, title)')
        .eq('user_id', user.id);

      if (fashionPurchases) {
        fashionPurchases.forEach(purchase => {
          if (purchase.fashion_products) {
            content.push({
              id: purchase.fashion_products.id,
              title: purchase.fashion_products.title,
              type: 'fashion',
              internalLink: `/store?product=fashion&id=${purchase.fashion_products.id}`
            });
          }
        });
      }

      // Fetch astrology purchases
      const { data: astrologyPurchases } = await supabase
        .from('astrology_purchases')
        .select('astrology_product_id, astrology_products(id, title)')
        .eq('user_id', user.id);

      if (astrologyPurchases) {
        astrologyPurchases.forEach(purchase => {
          if (purchase.astrology_products) {
            content.push({
              id: purchase.astrology_products.id,
              title: purchase.astrology_products.title,
              type: 'astrology',
              internalLink: `/store?product=astrology&id=${purchase.astrology_products.id}`
            });
          }
        });
      }

      setPurchasedContent(content);
      setFilteredContent(content);
    } catch (error) {
      console.error('Error fetching purchased content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (content: PurchasedContent) => {
    onSelectContent(content.internalLink, content.title);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          {selectedLink ? 'Change Linked Content' : 'Link Purchased Content (Optional)'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Content to Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your purchased content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : filteredContent.length === 0 ? (
              <p className="text-center text-muted-foreground">
                {searchTerm ? 'No matching content found' : 'No purchased content available'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredContent.map(content => (
                  <button
                    key={content.id}
                    onClick={() => handleSelect(content)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-border"
                  >
                    <p className="font-medium">{content.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{content.type}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
