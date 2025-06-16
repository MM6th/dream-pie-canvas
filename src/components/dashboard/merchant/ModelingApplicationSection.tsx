
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Plus } from "lucide-react";
import ModelingApplicationModal from "@/components/ModelingApplicationModal";

interface ModelingApplicationSectionProps {
  onSuccess: () => void;
}

const ModelingApplicationSection = ({ onSuccess }: ModelingApplicationSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Modeling Applications</h3>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Apply for Modeling
            </Button>
          </div>
          <p className="text-gray-400 mb-4">Apply to model fashion products you've purchased</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Camera className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Modeling Opportunities</p>
                  <p className="text-gray-400 text-sm">Showcase fashion products you've purchased</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ModelingApplicationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onSuccess} 
      />
    </>
  );
};

export default ModelingApplicationSection;
