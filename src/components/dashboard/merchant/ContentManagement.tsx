
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import VideoProductManager from "@/components/VideoProductManager";
import SongCoverManager from "@/components/SongCoverManager";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";

const ContentManagement = () => {
  const { isAdmin } = useApprovalStatus();

  return (
    <>
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
