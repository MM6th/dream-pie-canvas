
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Image, Star, Settings } from "lucide-react";
import MerchantsManagement from "./MerchantsManagement";
import CoverSubmissionsManagement from "./CoverSubmissionsManagement";
import ReviewsManagement from "./ReviewsManagement";
import AdminDashboardButtons from "./AdminDashboardButtons";

const AdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-300">Manage your platform</p>
      </div>

      <Tabs defaultValue="merchants" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger 
            value="merchants" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Merchants
          </TabsTrigger>
          <TabsTrigger 
            value="covers" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Image className="w-4 h-4 mr-2" />
            Cover Submissions
          </TabsTrigger>
          <TabsTrigger 
            value="reviews" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Star className="w-4 h-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merchants">
          <MerchantsManagement />
        </TabsContent>

        <TabsContent value="covers">
          <CoverSubmissionsManagement />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsManagement />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Admin Tools</h2>
            <AdminDashboardButtons />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
