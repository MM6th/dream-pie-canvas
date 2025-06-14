
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PendingMerchantCard from "./PendingMerchantCard";
import ApprovedMerchantCard from "./ApprovedMerchantCard";
import { Button } from "../ui/button";

interface Merchant {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  pinterest_url?: string | null;
  onlyfans_url?: string | null;
  snapchat_url?: string | null;
  contact_email?: string | null;
  paypal_email?: string | null;
  approval_status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [pendingMerchants, setPendingMerchants] = useState<Merchant[]>([]);
  const [approvedMerchants, setApprovedMerchants] = useState<Merchant[]>([]);
  const [rejectedMerchants, setRejectedMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching merchants:', error);
        return;
      }

      if (data) {
        console.log('Fetched merchants data:', data); // Added for debugging
        const pending = data.filter(merchant => merchant.approval_status === 'pending');
        const approved = data.filter(merchant => merchant.approval_status === 'approved');
        const rejected = data.filter(merchant => merchant.approval_status === 'rejected');
        
        setPendingMerchants(pending);
        setApprovedMerchants(approved);
        setRejectedMerchants(rejected);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();

    // Set up realtime subscription for profile changes
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profile update received, fetching merchants...');
          fetchMerchants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMerchants]);

  const handleApprovalChange = async (merchantId: string, newStatus: string) => {
    try {
      const { error } = await supabase.rpc('update_merchant_approval', {
        merchant_id: merchantId,
        new_status: newStatus
      });

      if (error) {
        console.error('Error updating merchant approval:', error);
        return;
      }

      // Refresh the merchant list
      fetchMerchants();
    } catch (error) {
      console.error('Error updating merchant approval:', error);
    }
  };

  if (loading && !pendingMerchants.length && !approvedMerchants.length) {
    return (
      <div className="text-white">Loading admin dashboard...</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
            <p className="text-gray-300">Manage merchant applications and approvals</p>
        </div>
        <Button onClick={fetchMerchants} disabled={loading} variant="outline" className="border-gray-600 text-white hover:bg-white hover:text-black">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{pendingMerchants.length}</p>
                <p className="text-gray-400">Pending Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">{approvedMerchants.length}</p>
                <p className="text-gray-400">Approved Merchants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-white">{rejectedMerchants.length}</p>
                <p className="text-gray-400">Rejected Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-yellow-500" />
          Merchants - Pending Approval
        </h3>
        
        {pendingMerchants.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No pending merchant applications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMerchants.map((merchant) => (
              <PendingMerchantCard
                key={merchant.id}
                merchant={merchant}
                onApprovalChange={handleApprovalChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approved Merchants */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Approved Merchants ({approvedMerchants.length})
        </h3>
        
        {approvedMerchants.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No approved merchants yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedMerchants.map((merchant) => (
              <ApprovedMerchantCard
                key={merchant.id}
                merchant={merchant}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
