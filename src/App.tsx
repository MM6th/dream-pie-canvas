
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Films from "./pages/Films";
import BulletinBoard from "./pages/BulletinBoard";

import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import ProfilePage from "./pages/ProfilePage";
import ProfilesDirectory from "./pages/ProfilesDirectory";

import PodcastSessionJoin from "./pages/PodcastSessionJoin";
import MintTokens from "./pages/MintTokens";
import MyAssets from "./pages/MyAssets";
import Live from "./pages/Live";
import GoLive from "./pages/GoLive";
import LiveWatch from "./pages/LiveWatch";
import LegacyLivestreamRedirect from "./pages/LegacyLivestreamRedirect";
import NotFound from "./pages/NotFound";
import ContestLive from "./pages/ContestLive";
import ContestTestPage from "./pages/ContestTestPage";
import NewUserUITestPage from "./pages/NewUserUITestPage";
import NewApp from "./pages/NewApp";
import { useContestRedirect } from "./hooks/useContestRedirect";
import { useContestInviteRedirect } from "./hooks/useContestInviteRedirect";

const queryClient = new QueryClient();

const ContestRedirectHandler = () => {
  useContestRedirect();
  useContestInviteRedirect();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ContestRedirectHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/films" element={<Films />} />
          <Route path="/bulletin" element={<BulletinBoard />} />
          
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          <Route path="/profiles" element={<ProfilesDirectory />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/livestream/:roomId" element={<LegacyLivestreamRedirect />} />
          <Route path="/podcast-session/:inviteToken" element={<PodcastSessionJoin />} />
          <Route path="/mint" element={<MintTokens />} />
          <Route path="/my-assets" element={<MyAssets />} />
          <Route path="/live" element={<Live />} />
          <Route path="/go-live" element={<GoLive />} />
          <Route path="/live/:streamId" element={<LiveWatch />} />
          <Route path="/contest/:postId" element={<ContestLive />} />
          <Route path="/contest-test" element={<ContestTestPage />} />
          <Route path="/new-user-ui-test" element={<NewUserUITestPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
