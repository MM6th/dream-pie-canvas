import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Star, 
  Image,
  MessageSquare,
  ChevronDown,
  FlaskConical,
  Ticket
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import MerchantsManagement from "./MerchantsManagement";
import CoverSubmissionsManagement from "./CoverSubmissionsManagement";
import ReviewsManagement from "./ReviewsManagement";
import AdminContentGallery from "./AdminContentGallery";
import AdminBulletinPostManager from "./AdminBulletinPostManager";
import VideoAdOpportunityManager from "./VideoAdOpportunityManager";
import TestPurchaseSimulator from "@/components/TestPurchaseSimulator";
import AdminTicketsManager from "./AdminTicketsManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSubmissionCounts } from "@/hooks/useSubmissionCounts";
import { useAuth } from "@/hooks/useAuth";
import { useQuarterlyIncome } from "@/hooks/useQuarterlyIncome";
import { useDashboardTutorial } from "@/hooks/useDashboardTutorial";
import { adminTutorialSteps } from "@/constants/tutorialContent";
import { TutorialTooltip } from "@/components/TutorialTooltip";
import { TutorialSpotlight } from "@/components/TutorialSpotlight";
import { TutorialHelpButton } from "@/components/TutorialHelpButton";

const AdminDashboard = () => {
  const { counts } = useSubmissionCounts();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const totalSubmissions = counts.coverSubmissions + counts.modelingApplications;
  
  // Admin dashboard doesn't auto-show tutorial (admin accounts are typically not new)
  const tutorial = useDashboardTutorial('admin', adminTutorialSteps, null);

  return (
    <div className="space-y-6">
      {/* Floating tutorial for first-time users only */}
      {tutorial.isActive && tutorial.currentStepData && tutorial.isFirstTimeUser && (
        <>
          <TutorialSpotlight 
            targetElement={tutorial.targetElement}
            isActive={tutorial.isActive}
          />
          <TutorialTooltip
            title={tutorial.currentStepData.title}
            description={tutorial.currentStepData.description}
            currentStep={tutorial.currentStep}
            totalSteps={tutorial.totalSteps}
            onNext={tutorial.nextStep}
            onSkip={tutorial.skipTutorial}
            targetElement={tutorial.targetElement}
            preferredPlacement={tutorial.currentStepData.placement}
          />
        </>
      )}
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-400 text-lg">Manage merchants, submissions, and platform content</p>
      </div>

      <Tabs defaultValue="merchants" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2 h-auto' : 'grid-cols-6'} bg-gray-800 border-gray-700`}>
          <TabsTrigger 
            value="merchants" 
            className={`text-white data-[state=active]:bg-gray-700 ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
            data-tutorial="merchants-tab"
          >
            <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 mr-2'}`} />
            Merchants
          </TabsTrigger>
          <TabsTrigger 
            value="submissions" 
            className={`text-white data-[state=active]:bg-gray-700 relative ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
            data-tutorial="submissions-tab"
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
          <TabsTrigger 
            value="tickets" 
            className={`text-white data-[state=active]:bg-gray-700 ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
          >
            <Ticket className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4 mr-2'}`} />
            Tickets
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger 
                value="reviews" 
                className="text-white data-[state=active]:bg-gray-700"
                data-tutorial="reviews-tab"
              >
                <Star className="w-4 h-4 mr-2" />
                Reviews
              </TabsTrigger>
              <TabsTrigger 
                value="gallery" 
                className="text-white data-[state=active]:bg-gray-700"
                data-tutorial="gallery-tab"
              >
                <Image className="w-4 h-4 mr-2" />
                Admin Content Gallery
              </TabsTrigger>
              <TabsTrigger 
                value="bulletin" 
                className="text-white data-[state=active]:bg-gray-700"
                data-tutorial="bulletin-tab"
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

        <TabsContent value="tickets" className="mt-6">
          <AdminTicketsManager />
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
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-tutorial="video-ads">
        <CardHeader>
          <CardTitle className="text-white">Video Ad Opportunities Management</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoAdOpportunityManager />
        </CardContent>
      </Card>

      {/* Developer Tools - Collapsible Section */}
      <Collapsible defaultOpen={false} className="mt-6">
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-gray-700/20 transition-colors">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Developer Tools (Testing Only)</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-200 text-xs">
                  ⚠️ <strong>Test Environment:</strong> Data created here is marked as test data and excluded from financial reports.
                </p>
              </div>
              <TestPurchaseSimulator />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default AdminDashboard;