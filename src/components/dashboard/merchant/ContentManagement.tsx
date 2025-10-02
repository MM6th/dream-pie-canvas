
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongCoverManager from "@/components/SongCoverManager";
import MerchantCoverSubmissionsManager from "@/components/MerchantCoverSubmissionsManager";
import ContractDashboard from "./ContractDashboard";
import BulletinPostManager from "@/components/BulletinPostManager";
import ContentGallery from "@/components/ContentGallery";
import SECalculatorModal from "@/components/SECalculatorModal";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQuarterlyIncome } from "@/hooks/useQuarterlyIncome";

const ContentManagement = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [hasPodcastDownloads, setHasPodcastDownloads] = useState(false);
  const { currentQuarterIncome } = useQuarterlyIncome(user?.id);
  
  // Check if user is admin - admins don't need cover submission functionality
  // since they can upload covers directly when creating products
  const isAdmin = user?.email === 'cmooregee@gmail.com';

  // Check if user has downloaded any podcasts
  useEffect(() => {
    const checkPodcastDownloads = async () => {
      if (!user || isAdmin) return;
      
      try {
        const { count } = await supabase
          .from('podcast_downloads')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', user.id);
        
        setHasPodcastDownloads((count || 0) > 0);
      } catch (error) {
        console.error('Error checking podcast downloads:', error);
      }
    };

    checkPodcastDownloads();
  }, [user, isAdmin]);

  // If user is admin, don't show cover submission functionality
  if (isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* SE Tax Calculator Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Tax Planning Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Self-Employment Tax Calculator</h4>
              <p className="text-gray-400 text-sm">
                Estimate your quarterly tax obligations as an independent contractor
              </p>
            </div>
            <SECalculatorModal userId={user?.id} autoPopulateIncome={currentQuarterIncome} />
          </div>
        </CardContent>
      </Card>

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
      
      {/* Content Gallery Section */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Content Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentGallery />
        </CardContent>
      </Card>

      {/* Cover Submission Management - Only show if user hasn't downloaded podcasts */}
      {!hasPodcastDownloads && (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Content Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cover-submissions" className="w-full">
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-2 h-auto' : 'grid-cols-2'} bg-gray-700 border-gray-600`}>
                <TabsTrigger 
                  value="cover-submissions" 
                  className={`text-white data-[state=active]:bg-gray-600 ${isMobile ? 'text-sm px-3 py-2 h-auto whitespace-normal' : ''}`}
                >
                  {isMobile ? 'Submit Covers' : 'Submit New Covers'}
                </TabsTrigger>
                <TabsTrigger 
                  value="my-submissions" 
                  className={`text-white data-[state=active]:bg-gray-600 ${isMobile ? 'text-sm px-3 py-2 h-auto whitespace-normal' : ''}`}
                >
                  {isMobile ? 'My Submissions' : 'My Submissions'}
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
      )}
    </div>
  );
};

export default ContentManagement;
