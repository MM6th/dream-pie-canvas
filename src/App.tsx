
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import Index from "./pages/Index";
import Films from "./pages/Films";
import BulletinBoard from "./pages/BulletinBoard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { useApprovalStatus } from "./hooks/useApprovalStatus";
import { toast } from "./hooks/use-toast";
import AuthPage from "./components/AuthPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, isAdmin, userType, loading: approvalLoading } = useApprovalStatus();
  const navigate = useNavigate();

  useEffect(() => {
    const loading = authLoading || approvalLoading;
    if (!loading && user && userType === 'merchant' && !isApproved && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be an approved merchant to access this page.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, userType, isApproved, isAdmin, authLoading, approvalLoading, navigate]);

  const loading = authLoading || approvalLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (user && userType === 'merchant' && !isApproved && !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/films" element={<ProtectedRoute><Films /></ProtectedRoute>} />
          <Route path="/bulletin" element={<ProtectedRoute><BulletinBoard /></ProtectedRoute>} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
