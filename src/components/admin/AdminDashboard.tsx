
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PendingMerchantCard from "./PendingMerchantCard";

interface PendingMerchant {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  onlyfans_url?: string;
  snapchat_url?: string;
  approval_status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [pendingMerchants, setPendingMerchants] = useState<PendingMerchant[]>([]);
  const [approvedMerchants, setApprovedMerchants] = useState<PendingMerchant[]>([]);
  const [rejectedMerchants, setRejectedMerchants] = useState<PendingMerchant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMerchants = async () => {
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
  };

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
  }, []);

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

  if (loading) {
    return (
      <div className="text-white">Loading admin dashboard...</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
        <p className="text-gray-300">Manage merchant applications and approvals</p>
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
          Independent Contractors - Pending Approval
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
        
        {approvedMerchants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {approvedMerchants.slice(0, 8).map((merchant) => (
              <Card key={merchant.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {merchant.avatar_url ? (
                      <img
                        src={merchant.avatar_url}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {merchant.display_name || merchant.email}
                      </p>
                      <Badge className="bg-green-500 text-white text-xs">
                        Approved
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
