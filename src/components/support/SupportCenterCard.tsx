import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Send } from "lucide-react";
import SupportTicketModal from "./SupportTicketModal";
import { useAuth } from "@/hooks/useAuth";

const SupportCenterCard = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4">
            Have a question or experiencing an issue? Submit a support ticket and our admin team will respond at their earliest convenience.
          </p>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit a Ticket
          </Button>
        </CardContent>
      </Card>

      <SupportTicketModal 
        open={showModal} 
        onOpenChange={setShowModal}
      />
    </>
  );
};

export default SupportCenterCard;
