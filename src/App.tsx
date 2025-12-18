
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Films from "./pages/Films";
import BulletinBoard from "./pages/BulletinBoard";
import AboutAuthor from "./pages/AboutAuthor";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import ProfilePage from "./pages/ProfilePage";
import ProfilesDirectory from "./pages/ProfilesDirectory";
import LivestreamRoom from "./pages/LivestreamRoom";
import PodcastSessionJoin from "./pages/PodcastSessionJoin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/films" element={<Films />} />
          <Route path="/bulletin" element={<BulletinBoard />} />
          <Route path="/about-author" element={<AboutAuthor />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          <Route path="/profiles" element={<ProfilesDirectory />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/livestream/:roomId" element={<LivestreamRoom />} />
          <Route path="/podcast-session/:inviteToken" element={<PodcastSessionJoin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
