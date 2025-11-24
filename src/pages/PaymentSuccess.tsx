
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Music, ArrowLeft, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<{
    transactionId?: string;
    amountPaid?: string;
  }>({});

  const orderId = searchParams.get('token');
  const paymentType = searchParams.get('type') || 'audio';
  const portfolioId = searchParams.get('portfolioId');

  // Wait for auth to load
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('PaymentSuccess - Auth session loaded:', session?.user?.id);
      console.log('PaymentSuccess - URL params:', {
        orderId,
        paymentType,
        credits: searchParams.get('credits'),
        allParams: Object.fromEntries(searchParams.entries())
      });
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const capturePayment = async () => {
      console.log('PaymentSuccess - capturePayment called', {
        authLoading,
        orderId,
        hasUser: !!user,
        paymentType
      });

      // Wait for both auth to load AND user to be available
      if (authLoading || !user) {
        console.log('PaymentSuccess - Waiting for auth/user...', { authLoading, hasUser: !!user });
        return;
      }

      if (!orderId) {
        console.error('PaymentSuccess - Missing orderId');
        toast({
          title: "Invalid Payment Link",
          description: "The payment link is invalid or expired.",
          variant: "destructive"
        });
        setProcessing(false);
        setSuccess(false);
        return;
      }

      try {
        let result;

        if (paymentType === "audio") {
          result = await supabase.functions.invoke('capture-paypal-payment', {
            body: { orderId }
          });
        } else if (paymentType === "portfolio") {
          result = await supabase.functions.invoke('capture-portfolio-payment', {
            body: { orderId, portfolioId }
          });
        } else if (paymentType === "astrology" || paymentType === "credit") {
          // Astrology and credit payments are captured by the edge function before redirecting here
          setSuccess(true);
          setProcessing(false);
          
          if (paymentType === "credit") {
            const creditsAmount = searchParams.get('credits');
            toast({
              title: "Purchase Successful",
              description: `You have successfully purchased ${creditsAmount} messaging credits!`
            });
          }
          return;
        } else if (paymentType === "fashion") {
          result = await supabase.functions.invoke('capture-fashion-payment', {
            body: { orderId }
          });
        }

        if (result?.error) {
          throw result.error;
        }

        setSuccess(true);
        toast({
          title: "Purchase Successful",
          description: "Your payment has been processed successfully!"
        });
      } catch (error: any) {
        console.error('Payment capture error:', error);
        
        let errorMessage = "There was an issue processing your payment. Please contact support.";
        
        if (error.details) {
          errorMessage += ` Details: ${error.details}`;
        }
        
        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        setSuccess(false);
      } finally {
        setProcessing(false);
      }
    };

    capturePayment();
  }, [authLoading, user, orderId, paymentType, searchParams]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToStore = () => {
    navigate('/?view=store');
  };

  const getIcon = () => {
    if (success) {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    }
    return paymentType === 'fashion' ? 
      <Shirt className="w-16 h-16 text-red-500" /> : 
      <Music className="w-16 h-16 text-red-500" />;
  };

  const getTitle = () => {
    if (success) return "Payment Successful!";
    return "Payment Failed";
  };

  const getSuccessMessage = () => {
    if (paymentType === 'fashion') {
      return "Thank you for your purchase! Your fashion item order has been confirmed.";
    }
    if (paymentType === 'portfolio') {
      return "Thank you for your purchase! The portfolio has been added to your dashboard.";
    }
    if (paymentType === 'credit') {
      const credits = searchParams.get('credits') || '50';
      return `Thank you! ${credits} messaging credits have been added to your account.`;
    }
    return "Thank you for your purchase! Your audio has been added to your music library.";
  };

  if (processing || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white mb-2">
              {authLoading ? 'Loading...' : 'Processing Payment...'}
            </h2>
            <p className="text-gray-400">
              {authLoading ? 'Please wait while we verify your session.' : 'Please wait while we confirm your purchase.'}
            </p>
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
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 text-center space-y-4">
          {success ? (
            <>
              <p className="text-gray-300">
                {getSuccessMessage()}
              </p>
              {paymentDetails.amountPaid && (
                <p className="text-gray-400 text-sm">
                  Amount paid: ${paymentDetails.amountPaid}
                </p>
              )}
              {paymentDetails.transactionId && (
                <p className="text-gray-400 text-xs">
                  Transaction ID: {paymentDetails.transactionId}
                </p>
              )}
              <p className="text-gray-400 text-sm">
                Redirecting to dashboard in a few seconds...
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
              {paymentType === 'fashion' ? <Shirt className="w-4 h-4 mr-2" /> : <Music className="w-4 h-4 mr-2" />}
              Browse Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
