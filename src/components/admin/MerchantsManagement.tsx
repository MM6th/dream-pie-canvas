
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingMerchantCard from "./PendingMerchantCard";
import ApprovedMerchantCard from "./ApprovedMerchantCard";
import { supabase } from "@/integrations/supabase/client";

interface Merchant {
  id: string;
  email: string;
  display_name: string | null;
  business_name: string | null;
  business_description: string | null;
  approval_status: string | null;
  created_at: string | null;
  paypal_email: string | null;
}

const MerchantsManagement = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const pendingMerchants = merchants.filter(m => m.approval_status === 'pending');
  const approvedMerchants = merchants.filter(m => m.approval_status === 'approved');

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        Loading merchants...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Merchant Management</h2>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
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
            Approved ({approvedMerchants.length})
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
                      onStatusUpdate={fetchMerchants}
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
                <div className="grid gap-4">
                  {approvedMerchants.map((merchant) => (
                    <ApprovedMerchantCard
                      key={merchant.id}
                      merchant={merchant}
                      onStatusUpdate={fetchMerchants}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantsManagement;
