
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, FileText } from "lucide-react";

interface AdminDashboardButtonsProps {
  onManageMerchants: () => void;
  onManageCoverSubmissions: () => void;
}

const AdminDashboardButtons = ({ onManageMerchants, onManageCoverSubmissions }: AdminDashboardButtonsProps) => {

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          Admin Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={onManageMerchants}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            Manage Merchants
          </Button>
          
          <Button
            onClick={onManageCoverSubmissions}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Cover Submissions
          </Button>

        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboardButtons;
