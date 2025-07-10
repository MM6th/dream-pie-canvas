import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import BirthDataForm from './BirthDataForm';

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  product_type: string;
  total_price: number;
}

interface AstrologyReadingModalProps {
  product: AstrologyProduct;
  isOpen: boolean;
  onClose: () => void;
  purchaseId?: string;
}

const AstrologyReadingModal = ({ product, isOpen, onClose, purchaseId }: AstrologyReadingModalProps) => {
  const { user } = useAuth();
  const [birthData, setBirthData] = useState<any>(null);
  const [reading, setReading] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBirthForm, setShowBirthForm] = useState(false);
  const [needsBirthData, setNeedsBirthData] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchBirthData();
    }
  }, [isOpen, user]);

  const fetchBirthData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_birth_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBirthData(data);
        setNeedsBirthData(false);
        // Check if reading already exists
        await checkExistingReading(data.id);
      } else {
        setNeedsBirthData(true);
        setShowBirthForm(true);
      }
    } catch (error) {
      console.error('Error fetching birth data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load birth data.',
        variant: 'destructive',
      });
    }
  };

  const checkExistingReading = async (birthDataId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('astrology_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('astrology_product_id', product.id)
        .eq('birth_data_id', birthDataId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setReading(data);
      }
    } catch (error) {
      console.error('Error checking existing reading:', error);
    }
  };

  const generateReading = async () => {
    if (!user || !birthData) return;

    // For testing - bypass purchase check temporarily
    // TODO: Remove this bypass in production
    const bypassPurchaseCheck = true;

    if (!bypassPurchaseCheck) {
      // Check if user has purchased this product
      const { data: purchase, error: purchaseError } = await supabase
        .from('astrology_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('astrology_product_id', product.id)
        .single();

      if (purchaseError || !purchase) {
        toast({
          title: 'Purchase Required',
          description: 'You must purchase this astrology product before generating a reading.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-astrology-reading', {
        body: {
          birthData,
          productType: product.product_type,
          productId: product.id,
          purchaseId: 'test-purchase-id' // Use test ID for now
        }
      });

      if (error) {
        throw error;
      }

      setReading(data.reading);
      toast({
        title: 'Success',
        description: 'Your astrology reading has been generated!',
      });
    } catch (error) {
      console.error('Error generating reading:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate astrology reading.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBirthDataSuccess = (data: any) => {
    setBirthData(data);
    setNeedsBirthData(false);
    setShowBirthForm(false);
    checkExistingReading(data.id);
  };

  const renderReadingContent = () => {
    if (!reading) return null;

    const content = reading.reading_content;
    const sections = content.sections || {};

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">{content.title}</h3>
          <p className="text-gray-300">{content.summary}</p>
        </div>

        <Tabs defaultValue={Object.keys(sections)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 bg-gray-700">
            {Object.entries(sections).map(([key, section]: [string, any]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(sections).map(([key, section]: [string, any]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {product.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {needsBirthData && showBirthForm ? (
            <BirthDataForm
              onSuccess={handleBirthDataSuccess}
              onCancel={() => setShowBirthForm(false)}
              isModal={true}
            />
          ) : needsBirthData ? (
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">
                We need your birth information to generate your personalized astrology reading.
              </p>
              <Button
                onClick={() => setShowBirthForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enter Birth Data
              </Button>
            </div>
          ) : reading ? (
            renderReadingContent()
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">
                Your birth data is ready. Generate your personalized astrology reading now.
              </p>
              <Button
                onClick={generateReading}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating Reading...
                  </>
                ) : (
                  'Generate Reading'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyReadingModal;