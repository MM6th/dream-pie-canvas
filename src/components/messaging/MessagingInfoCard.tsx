import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MessageSquare, CreditCard, DollarSign, Users } from 'lucide-react';

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
        <Alert className="bg-green-500/10 border-green-500/30">
          <DollarSign className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Revenue Split (90/10):</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Recipients earn 90%</strong> ($0.09 per credit spent)</li>
              <li>• <strong>PIE platform fee: 10%</strong> ($0.01 per credit)</li>
              <li>• 1 credit = $0.10 total value</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            <strong>Message Costs:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Starting a new thread</strong> costs credits</li>
              <li>• <strong>Replies within a thread are FREE</strong> for both parties</li>
              <li>• Merchants set their own rates (1-100 credits)</li>
              <li>• Default rate for supporters: 10 credits</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            <strong>Who Can Earn:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Both merchants AND supporters</strong> can earn from messages</li>
              <li>• Merchants can message supporters (costs credits)</li>
              <li>• Supporters can message merchants (costs credits)</li>
              <li>• Supporter-to-supporter messaging is disabled</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            <strong>About Credits:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Purchase credits in packages: 50, 100, or 200 credits</li>
              <li>• Check your balance in the message composer</li>
              <li>• View transaction history in the Messages tab</li>
            </ul>
          </AlertDescription>
        </Alert>

        {userType === 'supporter' && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong>Supporter Earnings:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• You earn <strong>$0.09 per credit</strong> when merchants message you</li>
                <li>• Earnings tracked for payout at $100 threshold</li>
                <li>• Revenue appears in your quarterly income</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {userType === 'merchant' && (
          <Alert className="bg-purple-500/10 border-purple-500/30">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <strong>Merchant Info:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• You earn <strong>$0.09 per credit</strong> spent on messages to you</li>
                <li>• To message supporters, you need credits too</li>
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
