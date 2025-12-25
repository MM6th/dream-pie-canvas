import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PendingMerchantCard from "./PendingMerchantCard";
import ApprovedMerchantCard from "./ApprovedMerchantCard";
import SupporterCard from "./SupporterCard";
import { supabase } from "@/integrations/supabase/client";

interface Merchant {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  business_name: string | null;
  business_description: string | null;
  industry: string | null;
  skills: string[] | null;
  website: string | null;
  contact_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  pinterest_url: string | null;
  onlyfans_url: string | null;
  snapchat_url: string | null;
  paypal_email: string | null;
  is_adult_creator: boolean | null;
  approval_status: string | null;
  created_at: string | null;
  is_live_stream_artist?: boolean | null;
}

interface Supporter {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_live_stream_artist?: boolean | null;
}

const MerchantsManagement = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMerchants = async () => {
    try {
      // Explicitly select only required fields to minimize data exposure
      // Even though admins have full access, this follows data minimization principles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          display_name,
          avatar_url,
          business_name,
          business_description,
          industry,
          skills,
          website,
          contact_email,
          facebook_url,
          instagram_url,
          youtube_url,
          pinterest_url,
          onlyfans_url,
          snapchat_url,
          paypal_email,
          is_adult_creator,
          approval_status,
          created_at,
          is_live_stream_artist
        `)
        .eq('user_type', 'merchant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  };

  const fetchSupporters = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, created_at, is_live_stream_artist')
        .eq('user_type', 'supporter')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupporters(data || []);
    } catch (error) {
      console.error('Error fetching supporters:', error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMerchants(), fetchSupporters()]);
    setLoading(false);
  };

  const handleApprovalChange = async (merchantId: string, newStatus: string) => {
    try {
      const { error } = await supabase.rpc('update_merchant_approval', {
        merchant_id: merchantId,
        new_status: newStatus
      });

      if (error) throw error;
      fetchMerchants();
    } catch (error) {
      console.error('Error updating merchant approval:', error);
    }
  };

  const handleToggleLiveStreamArtist = async (userId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_live_stream_artist: value })
        .eq('id', userId);

      if (error) throw error;
      fetchAll();
    } catch (error) {
      console.error('Error toggling live stream artist:', error);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const pendingMerchants = merchants.filter(m => m.approval_status === 'pending');
  const approvedMerchants = merchants.filter(m => m.approval_status === 'approved');

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">User Management</h2>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger 
            value="pending" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Pending ({pendingMerchants.length})
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Merchants ({approvedMerchants.length})
          </TabsTrigger>
          <TabsTrigger 
            value="supporters" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Supporters ({supporters.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Pending Merchant Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingMerchants.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No pending applications.</p>
              ) : (
                <div className="grid gap-4">
                  {pendingMerchants.map((merchant) => (
                    <PendingMerchantCard
                      key={merchant.id}
                      merchant={merchant}
                      onApprovalChange={handleApprovalChange}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Approved Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedMerchants.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No approved merchants yet.</p>
              ) : (
                <Carousel className="w-full max-w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {approvedMerchants.map((merchant) => (
                      <CarouselItem key={merchant.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                        <ApprovedMerchantCard 
                          merchant={merchant} 
                          onToggleLiveStreamArtist={handleToggleLiveStreamArtist}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supporters">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Supporters</CardTitle>
            </CardHeader>
            <CardContent>
              {supporters.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No supporters yet.</p>
              ) : (
                <Carousel className="w-full max-w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {supporters.map((supporter) => (
                      <CarouselItem key={supporter.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                        <SupporterCard 
                          supporter={supporter} 
                          onToggleLiveStreamArtist={handleToggleLiveStreamArtist}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantsManagement;
