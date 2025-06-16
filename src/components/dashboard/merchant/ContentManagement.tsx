
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import AudioProductManager from "@/components/AudioProductManager";
import VideoProductManager from "@/components/VideoProductManager";
import SongCoverManager from "@/components/SongCoverManager";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";

const ContentManagement = () => {
  const { isAdmin } = useApprovalStatus();

  return (
    <>
      {/* Audio Products Management */}
      <div className="mb-12">
        <AudioProductManager />
      </div>

      {/* Video Products Management */}
      <div className="mb-12">
        <VideoProductManager />
      </div>

      {/* Song Cover Management - For non-admin merchants only */}
      {!isAdmin && (
        <div className="mb-12">
          <SongCoverManager />
        </div>
      )}
    </>
  );
};

export default ContentManagement;
