
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PendingMerchantCard from "./PendingMerchantCard";
import ApprovedMerchantCard from "./ApprovedMerchantCard";
import CoverPhotoManager from "./CoverPhotoManager";
import AdminDashboardButtons from "./AdminDashboardButtons";

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  const { data: pendingMerchants, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .eq('approval_status', 'pending');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: approvedMerchants, isLoading: approvedLoading } = useQuery({
    queryKey: ['approved-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .eq('approval_status', 'approved');
      
      if (error) throw error;
      return data;
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
    queryClient.invalidateQueries({ queryKey: ['approved-merchants'] });
    toast({
      title: "Refreshed",
      description: "Merchant data has been refreshed"
    });
  };

  const handleApprovalChange = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
    queryClient.invalidateQueries({ queryKey: ['approved-merchants'] });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Admin Dashboard
            </h2>
            <p className="text-gray-400">Manage merchants and platform content</p>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <AdminDashboardButtons />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Merchants Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <p className="text-gray-400">Loading...</p>
            ) : pendingMerchants?.length === 0 ? (
              <p className="text-gray-400">No pending merchants</p>
            ) : (
              <div className="space-y-4">
                {pendingMerchants?.map((merchant) => (
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

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Approved Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedLoading ? (
              <p className="text-gray-400">Loading...</p>
            ) : approvedMerchants?.length === 0 ? (
              <p className="text-gray-400">No approved merchants</p>
            ) : (
              <div className="space-y-4">
                {approvedMerchants?.map((merchant) => (
                  <ApprovedMerchantCard 
                    key={merchant.id} 
                    merchant={merchant} 
                    onApprovalChange={handleApprovalChange}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CoverPhotoManager />
    </div>
  );
};

export default AdminDashboard;
