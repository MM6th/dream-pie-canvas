
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Star, 
  ShoppingBag, 
  Zap, 
  Image,
  UserCheck,
  MessageSquare
} from "lucide-react";
import MerchantsManagement from "./MerchantsManagement";
import CoverSubmissionsManagement from "./CoverSubmissionsManagement";
import ReviewsManagement from "./ReviewsManagement";
import AdminPhotoGallery from "./AdminPhotoGallery";
import { useSubmissionCounts } from "@/hooks/useSubmissionCounts";

const AdminDashboard = () => {
  const { counts } = useSubmissionCounts();
  const totalSubmissions = counts.coverSubmissions + counts.modelingApplications;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-400 text-lg">Manage merchants, submissions, and platform content</p>
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
            value="submissions" 
            className="text-white data-[state=active]:bg-gray-700 relative"
          >
            <FileText className="w-4 h-4 mr-2" />
            Cover Submissions
            {totalSubmissions > 0 && (
              <Badge className="ml-2 bg-red-600 text-white animate-pulse">
                {totalSubmissions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="reviews" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Star className="w-4 h-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger 
            value="gallery" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            <Image className="w-4 h-4 mr-2" />
            Photo Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merchants" className="mt-6">
          <MerchantsManagement />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <CoverSubmissionsManagement />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsManagement />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <AdminPhotoGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
