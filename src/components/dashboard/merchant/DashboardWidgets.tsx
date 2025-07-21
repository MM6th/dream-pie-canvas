
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackgroundUpload from "@/components/BackgroundUpload";
import AudioUploadModal from "@/components/AudioUploadModal";
import VideoProductManager from "@/components/VideoProductManager";
import FashionProductUploadModal from "@/components/FashionProductUploadModal";
import AstrologyProductUploadModal from "@/components/AstrologyProductUploadModal";
import FashionProductManager from "@/components/FashionProductManager";
import AudioProductManager from "@/components/AudioProductManager";
import AstrologyProductManager from "@/components/AstrologyProductManager";

interface DashboardWidgetsProps {
  onSuccess: () => void;
  onViewStore: () => void;
  onBackgroundUpload: (url: string) => void;
  isAdmin: boolean;
}

const DashboardWidgets = ({ onSuccess, onViewStore, onBackgroundUpload, isAdmin }: DashboardWidgetsProps) => {
  const [isFashionModalOpen, setIsFashionModalOpen] = useState(false);
  const [isAstrologyModalOpen, setIsAstrologyModalOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Astrology Products - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Astrology Products</h3>
                <Button
                  onClick={() => setIsAstrologyModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Astrology Product
                </Button>
              </div>
              <p className="text-gray-400 mb-4">Create and manage astrology readings and consultations</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Total Astrology Products</p>
                    <p className="text-gray-400 text-sm">Manage astrology services</p>
                  </div>
                  <Button
                    onClick={onViewStore}
                    variant="outline"
                    className="border-gray-600 text-white bg-black hover:bg-gray-800"
                  >
                    View in Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Astrology Product Management - Admin Only */}
      {isAdmin && (
        <div className="mb-12">
          <AstrologyProductManager />
        </div>
      )}

      {/* Fashion Products - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Fashion Products</h3>
                <Button
                  onClick={() => setIsFashionModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Upload Fashion Product
                </Button>
              </div>
              <p className="text-gray-400 mb-4">Upload and manage fashion products for the store</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Total Fashion Products</p>
                    <p className="text-gray-400 text-sm">Manage fashion inventory</p>
                  </div>
                  <Button
                    onClick={onViewStore}
                    variant="outline"
                    className="border-gray-600 text-white bg-black hover:bg-gray-800"
                  >
                    View in Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fashion Product Management - Admin Only */}
      {isAdmin && (
        <div className="mb-12">
          <FashionProductManager />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {isAdmin && (
          <Card className="lg:col-span-3 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Audio Products</h3>
                <AudioUploadModal onSuccess={onSuccess} />
              </div>
              <p className="text-gray-400 mb-4">Upload and manage your audio content</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Total Audio Products</p>
                    <p className="text-gray-400 text-sm">Manage your audio library</p>
                  </div>
                  <Button
                    onClick={onViewStore}
                    variant="outline"
                    className="border-gray-600 text-white bg-black hover:bg-gray-800"
                  >
                    View in Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audio Product Management - Admin Only */}
      {isAdmin && (
        <div className="mb-12">
          <AudioProductManager />
        </div>
      )}

      {/* Video Products - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Video Products</h3>
              </div>
              <p className="text-gray-400 mb-4">Upload and manage your video content</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Total Video Products</p>
                    <p className="text-gray-400 text-sm">Manage your video library</p>
                  </div>
                  <Button
                    onClick={onViewStore}
                    variant="outline"
                    className="border-gray-600 text-white bg-black hover:bg-gray-800"
                  >
                    View in Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Product Management - Admin Only */}
      {isAdmin && (
        <div className="mb-12">
          <VideoProductManager />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Upload Background</h3>
            <BackgroundUpload onUploadSuccess={onBackgroundUpload} />
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Films</h3>
            </div>
            <p className="text-gray-400 mb-4">Upload and manage your video content for the films page</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Total Films</p>
                  <p className="text-gray-400 text-sm">Manage your video library</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fashion Product Upload Modal */}
      <FashionProductUploadModal 
        isOpen={isFashionModalOpen}
        onClose={() => setIsFashionModalOpen(false)}
        onSuccess={onSuccess} 
      />

      {/* Astrology Product Upload Modal */}
      <AstrologyProductUploadModal 
        isOpen={isAstrologyModalOpen}
        onClose={() => setIsAstrologyModalOpen(false)}
        onSuccess={onSuccess} 
      />
    </div>
  );
};

export default DashboardWidgets;
