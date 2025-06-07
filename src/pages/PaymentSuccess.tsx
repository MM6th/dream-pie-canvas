
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Music, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);

  const orderId = searchParams.get('token');
  const productId = searchParams.get('product_id');

  useEffect(() => {
    const capturePayment = async () => {
      if (!orderId || !user) {
        setProcessing(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
          body: { orderId },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) throw error;

        if (data.success) {
          setSuccess(true);
          toast({
            title: "Payment Successful!",
            description: "Your audio has been added to your library.",
          });
        } else {
          throw new Error('Payment capture failed');
        }
      } catch (error: any) {
        console.error('Payment capture error:', error);
        toast({
          title: "Payment Error",
          description: "There was an issue processing your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setProcessing(false);
      }
    };

    capturePayment();
  }, [orderId, user]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToStore = () => {
    navigate('/?view=store');
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white mb-2">Processing Payment...</h2>
            <p className="text-gray-400">Please wait while we confirm your purchase.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {success ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <Music className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {success ? "Payment Successful!" : "Payment Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 text-center space-y-4">
          {success ? (
            <>
              <p className="text-gray-300">
                Thank you for your purchase! Your audio has been added to your music library.
              </p>
              <p className="text-gray-400 text-sm">
                You can now listen to your purchased audio in your dashboard.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-300">
                There was an issue processing your payment. Please try again or contact support.
              </p>
              <p className="text-gray-400 text-sm">
                If you were charged, please contact us for assistance.
              </p>
            </>
          )}
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              className="border-gray-600 text-white hover:bg-white hover:text-black"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              onClick={handleBackToStore}
              className="bg-primary hover:bg-primary/90"
            >
              <Music className="w-4 h-4 mr-2" />
              Browse Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
