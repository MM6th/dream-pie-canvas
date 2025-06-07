
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, Music } from "lucide-react";

const PaymentCancelled = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToStore = () => {
    navigate('/?view=store');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 text-center space-y-4">
          <p className="text-gray-300">
            Your payment was cancelled. No charges were made to your account.
          </p>
          <p className="text-gray-400 text-sm">
            Feel free to browse our store and try again when you're ready.
          </p>
          
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

export default PaymentCancelled;
