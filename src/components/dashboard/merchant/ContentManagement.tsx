
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongCoverManager from "@/components/SongCoverManager";
import MerchantCoverSubmissionsManager from "@/components/MerchantCoverSubmissionsManager";
import ContractDashboard from "./ContractDashboard";
import BulletinPostManager from "@/components/BulletinPostManager";
import { useAuth } from "@/hooks/useAuth";

const ContentManagement = () => {
  const { user } = useAuth();
  
  // Check if user is admin - admins don't need cover submission functionality
  // since they can upload covers directly when creating products
  const isAdmin = user?.email === 'cmooregee@gmail.com';

  // If user is admin, don't show cover submission functionality
  if (isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Bulletin Board Management */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Bulletin Board Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <BulletinPostManager />
        </CardContent>
      </Card>

      {/* TuneCore Contracts Section */}
      <ContractDashboard />
      
      {/* Cover Submission Management */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Content Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cover-submissions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700 border-gray-600">
              <TabsTrigger 
                value="cover-submissions" 
                className="text-white data-[state=active]:bg-gray-600"
              >
                Submit New Covers
              </TabsTrigger>
              <TabsTrigger 
                value="my-submissions" 
                className="text-white data-[state=active]:bg-gray-600"
              >
                My Submissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cover-submissions" className="mt-6">
              <SongCoverManager />
            </TabsContent>

            <TabsContent value="my-submissions" className="mt-6">
              <MerchantCoverSubmissionsManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;
