
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongCoverManager from "@/components/SongCoverManager";
import MerchantCoverSubmissionsManager from "@/components/MerchantCoverSubmissionsManager";

const ContentManagement = () => {
  return (
    <div className="mb-8">
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
