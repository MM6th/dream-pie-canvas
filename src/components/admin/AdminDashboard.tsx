import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Star, 
  Image,
  MessageSquare
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import MerchantsManagement from "./MerchantsManagement";
import CoverSubmissionsManagement from "./CoverSubmissionsManagement";
import ReviewsManagement from "./ReviewsManagement";
import AdminContentGallery from "./AdminContentGallery";
import AdminBulletinPostManager from "./AdminBulletinPostManager";
import VideoAdOpportunityManager from "./VideoAdOpportunityManager";
import SECalculatorModal from "@/components/SECalculatorModal";
import AdminDataExport from "./AdminDataExport";
import { useSubmissionCounts } from "@/hooks/useSubmissionCounts";

const AdminDashboard = () => {
  const { counts } = useSubmissionCounts();
  const isMobile = useIsMobile();
  const totalSubmissions = counts.coverSubmissions + counts.modelingApplications;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-400 text-lg">Manage merchants, submissions, and platform content</p>
      </div>

      {/* SE Tax Calculator Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Administrative Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Self-Employment Tax Calculator</h4>
              <p className="text-gray-400 text-sm">
                Tax planning tool for administrative reference and merchant support
              </p>
            </div>
            <SECalculatorModal />
          </div>
        </CardContent>
      </Card>

      {/* Data Export Tools */}
      <AdminDataExport />

      <Tabs defaultValue="merchants" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2 h-auto' : 'grid-cols-5'} bg-gray-800 border-gray-700`}>
          <TabsTrigger 
            value="merchants" 
            className={`text-white data-[state=active]:bg-gray-700 ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
          >
            <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 mr-2'}`} />
            Merchants
          </TabsTrigger>
          <TabsTrigger 
            value="submissions" 
            className={`text-white data-[state=active]:bg-gray-700 relative ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
          >
            <div className={`flex ${isMobile ? 'flex-col' : ''} items-center gap-1`}>
              <FileText className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 mr-2'}`} />
              {isMobile ? 'Contracts' : 'Contract Submissions'}
              {totalSubmissions > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse text-xs">
                  {totalSubmissions}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          {!isMobile && (
            <>
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
                Admin Content Gallery
              </TabsTrigger>
              <TabsTrigger 
                value="bulletin" 
                className="text-white data-[state=active]:bg-gray-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Bulletin Posts
              </TabsTrigger>
            </>
          )}
          {isMobile && (
            <TabsTrigger 
              value="more" 
              className="text-white data-[state=active]:bg-gray-700 text-xs px-2 py-2 h-auto flex-col gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              More
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="merchants" className="mt-6">
          <MerchantsManagement />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <CoverSubmissionsManagement />
        </TabsContent>

        {!isMobile && (
          <>
            <TabsContent value="reviews" className="mt-6">
              <ReviewsManagement />
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
              <AdminContentGallery />
            </TabsContent>

            <TabsContent value="bulletin" className="mt-6">
              <AdminBulletinPostManager />
            </TabsContent>
          </>
        )}

        {isMobile && (
          <TabsContent value="more" className="mt-6">
            <div className="space-y-6">
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Reviews Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewsManagement />
                </CardContent>
              </Card>
              
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Admin Content Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminContentGallery />
                </CardContent>
              </Card>
              
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Bulletin Posts Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminBulletinPostManager />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Video Ad Opportunities Management */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Video Ad Opportunities Management</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoAdOpportunityManager />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;