import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, FlaskConical, Sparkles } from "lucide-react";
import ContestInviteCard from "@/components/contest/ContestInviteCard";

interface GoLiveCardProps {
  isAdmin?: boolean;
}

const GoLiveCard = ({ isAdmin }: GoLiveCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 mb-6">
      <Card className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-red-600/30 backdrop-blur-sm">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              Go Live
            </h3>
            <p className="text-muted-foreground text-sm">Start a live broadcast for your followers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/go-live')}
              className="bg-red-600 hover:bg-red-700 text-white px-6"
            >
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/contest-test')}
                className="border-purple-600/50 text-purple-400 hover:bg-purple-900/20"
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Test Challenge UI
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-purple-600/30 backdrop-blur-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Test New User UI
              </h3>
              <p className="text-muted-foreground text-sm">
                Isolated sandbox for prototyping the next user dashboard — existing dashboards are untouched
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/new-user-ui-test')}
              className="border-purple-600/50 text-purple-300 hover:bg-purple-900/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Open Sandbox
            </Button>
          </CardContent>
        </Card>
      )}

      <ContestInviteCard />
    </div>
  );
};

export default GoLiveCard;
