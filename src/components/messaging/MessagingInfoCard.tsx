import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MessageSquare, CreditCard, Ban } from 'lucide-react';

interface MessagingInfoCardProps {
  userType?: 'merchant' | 'supporter';
}

export const MessagingInfoCard = ({ userType }: MessagingInfoCardProps) => {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          How Messaging Works
        </CardTitle>
        <CardDescription>
          Important information about the messaging system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            <strong>Message Costs & Earnings:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>10 credits per message</strong> for all messaging</li>
              <li>• <strong>1 credit = $0.10</strong> - Recipients earn $0.10 per credit spent</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            <strong>About Credits:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Purchase credits in packages: 50, 100, or 200 credits</li>
              <li>• Credits are used for messaging</li>
              <li>• Check your balance in the message composer</li>
              <li>• View transaction history in the Messages tab</li>
            </ul>
          </AlertDescription>
        </Alert>

        {userType === 'supporter' && (
          <Alert>
            <Ban className="h-4 w-4" />
            <AlertDescription>
              <strong>Messaging Rules:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Supporters cannot message other supporters</li>
                <li>• You can message merchants (10 credits per message)</li>
                <li>• Messages support photos and replies</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {userType === 'merchant' && (
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              <strong>Merchant Earnings:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Earn <strong>$0.10 per credit</strong> spent on messages to you</li>
                <li>• Set your rate (1-100 credits) in Messaging Settings</li>
                <li>• Revenue tracked quarterly for tax reporting</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
