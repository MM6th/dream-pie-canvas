import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, DollarSign, Users, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MessagingTutorialCardProps {
  userType: 'merchant' | 'supporter';
}

export const MessagingTutorialCard = ({ userType }: MessagingTutorialCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <CardTitle className="text-white text-sm">Messaging System</CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          {userType === 'merchant' 
            ? 'Earn money by receiving messages from supporters'
            : 'Connect with creators through our credit-based messaging'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {userType === 'merchant' ? (
          <>
            <Alert className="bg-green-900/30 border-green-700/50">
              <DollarSign className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-gray-300 text-xs">
                <strong className="text-green-400">Set Your Rates:</strong> Go to your <strong>Profile tab</strong> → <strong>Messaging Settings</strong> to set how many credits (1-100) supporters pay to message you. You earn 10% of each credit spent!
              </AlertDescription>
            </Alert>
            <Alert className="bg-blue-900/30 border-blue-700/50">
              <Users className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300 text-xs">
                <strong className="text-blue-400">Free Merchant Chat:</strong> Messaging between merchants is completely free. Collaborate and network without spending credits!
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <Alert className="bg-purple-900/30 border-purple-700/50">
              <Info className="h-4 w-4 text-purple-400" />
              <AlertDescription className="text-gray-300 text-xs">
                <strong className="text-purple-400">Credit System:</strong> Purchase credits to message merchants. Each merchant sets their own rate (1-100 credits per message).
              </AlertDescription>
            </Alert>
            <Alert className="bg-blue-900/30 border-blue-700/50">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300 text-xs">
                <strong className="text-blue-400">Buy Credits:</strong> Look for the credits icon in the header to purchase credit packages (50, 100, or 200 credits).
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
