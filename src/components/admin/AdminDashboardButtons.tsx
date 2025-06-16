
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Edit } from "lucide-react";

interface AdminDashboardButtonsProps {
  onRefresh: () => void;
  onCoverSubmissions: () => void;
}

const AdminDashboardButtons = ({ onRefresh, onCoverSubmissions }: AdminDashboardButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onRefresh}
        className="bg-black text-white border-0"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
      
      <Button
        onClick={onCoverSubmissions}
        className="bg-black text-white border-0"
      >
        <FileText className="w-4 h-4 mr-2" />
        Cover Submissions
      </Button>
    </div>
  );
};

export default AdminDashboardButtons;
