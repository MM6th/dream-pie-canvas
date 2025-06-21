import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, RefreshCw, FileText, MessageSquare, BookOpen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import PendingMerchantCard from "./PendingMerchantCard";
import ApprovedMerchantCard from "./ApprovedMerchantCard";
import CoverSubmissionManager from "@/components/CoverSubmissionManager";
import ModelingApplicationManager from "@/components/ModelingApplicationManager";
import PhotoGallery from "@/components/PhotoGallery";
import BulletinPostManager from "@/components/BulletinPostManager";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("merchants");

  const { data: pendingMerchants, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingMerchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: approvedMerchants, isLoading: approvedLoading } = useQuery({
    queryKey: ['approvedMerchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'merchant')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const handleApprovalChange = async (merchantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: newStatus })
        .eq('id', merchantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Merchant ${newStatus} successfully!`
      });

      queryClient.invalidateQueries({ queryKey: ['pendingMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['approvedMerchants'] });
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update merchant status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pendingMerchants'] });
    queryClient.invalidateQueries({ queryKey: ['approvedMerchants'] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Admin Dashboard
            </h2>
            <p className="text-gray-400">Manage merchants and platform content</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/about-author')}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              About Author
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800 border-gray-700">
          <TabsTrigger value="merchants" className="text-white data-[state=active]:bg-gray-700">
            <Users className="w-4 h-4 mr-2" />
            Merchants
          </TabsTrigger>
          <TabsTrigger value="cover-submissions" className="text-white data-[state=active]:bg-gray-700">
            <FileText className="w-4 h-4 mr-2" />
            Cover Submissions
          </TabsTrigger>
          <TabsTrigger value="modeling-applications" className="text-white data-[state=active]:bg-gray-700">
            <Users className="w-4 h-4 mr-2" />
            Modeling Applications
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-white data-[state=active]:bg-gray-700">
            Photo Gallery
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-white data-[state=active]:bg-gray-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            Bulletin Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merchants">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Pending Approval</h3>
              {pendingLoading ? (
                <div className="text-center text-white">Loading pending merchants...</div>
              ) : pendingMerchants?.length === 0 ? (
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No pending merchants</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingMerchants?.map((merchant) => (
                    <PendingMerchantCard
                      key={merchant.id}
                      merchant={merchant}
                      onApprovalChange={handleApprovalChange}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Approved Merchants</h3>
              {approvedLoading ? (
                <div className="text-center text-white">Loading approved merchants...</div>
              ) : approvedMerchants?.length === 0 ? (
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No approved merchants</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {approvedMerchants?.map((merchant) => (
                    <ApprovedMerchantCard
                      key={merchant.id}
                      merchant={merchant}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cover-submissions">
          <CoverSubmissionManager />
        </TabsContent>

        <TabsContent value="modeling-applications">
          <ModelingApplicationManager />
        </TabsContent>

        <TabsContent value="photos">
          <PhotoGallery />
        </TabsContent>

        <TabsContent value="posts">
          <BulletinPostManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
