
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Tv, User, Video, Coins, Loader2, Clock } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";
import { useAuth } from "@/hooks/useAuth";
import { useLivestreamEntry } from "@/hooks/useLivestreamEntry";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format, differenceInSeconds, isPast } from "date-fns";

interface TVGuideSectionProps {
  posts: BulletinPost[];
  useCarousel?: boolean;
  onNeedsCredits?: () => void;
}

const TVGuideSection = ({ posts, useCarousel = true, onNeedsCredits }: TVGuideSectionProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enterLivestream, loading: enteringStream } = useLivestreamEntry();
  const { balance, refetch: refetchBalance } = useMessagingCredits(user?.id);
  const [enteredPosts, setEnteredPosts] = useState<Set<string>>(new Set());
  const [checkingEntries, setCheckingEntries] = useState(true);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      checkExistingEntries();
    } else {
      setCheckingEntries(false);
    }
  }, [user, posts]);

  // Update countdowns every second
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      posts.forEach((post) => {
        if (post.scheduled_at) {
          const scheduledTime = new Date(post.scheduled_at);
          const now = new Date();
          const diff = differenceInSeconds(scheduledTime, now);

          if (diff <= 0) {
            newCountdowns[post.id] = "LIVE NOW";
          } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            const seconds = diff % 60;
            newCountdowns[post.id] = `${minutes}m ${seconds}s`;
          } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            newCountdowns[post.id] = `${hours}h ${minutes}m`;
          } else {
            const days = Math.floor(diff / 86400);
            newCountdowns[post.id] = `${days}d`;
          }
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [posts]);

  const checkExistingEntries = async () => {
    if (!user) return;
    
    const paidPostIds = posts
      .filter(p => p.is_paid_livestream)
      .map(p => p.id);
    
    if (paidPostIds.length === 0) {
      setCheckingEntries(false);
      return;
    }

    const { data: entries } = await supabase
      .from('livestream_entries')
      .select('bulletin_post_id')
      .eq('user_id', user.id)
      .in('bulletin_post_id', paidPostIds);

    if (entries) {
      setEnteredPosts(new Set(entries.map(e => e.bulletin_post_id)));
    }
    setCheckingEntries(false);
  };

  const handleEnterStream = async (post: BulletinPost) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to enter this livestream",
        variant: "destructive",
      });
      return;
    }

    const totalCredits = (post.livestream_credits_per_minute || 1) * 3;
    
    if (balance < totalCredits && !enteredPosts.has(post.id)) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${totalCredits} credits to enter. You have ${balance}.`,
        variant: "destructive",
      });
      onNeedsCredits?.();
      return;
    }

    const result = await enterLivestream(post.id, post.room_id ? `/livestream/room/${post.room_id}` : '');
    if (result.success) {
      setEnteredPosts(prev => new Set(prev).add(post.id));
      refetchBalance();
      // Navigate to the room
      if (post.room_id) {
        navigate(`/livestream/room/${post.room_id}`);
      }
    }
  };

  const handleJoinRoom = (post: BulletinPost) => {
    if (post.room_id) {
      navigate(`/livestream/room/${post.room_id}`);
    }
  };

  const hasNoPosts = posts.length === 0;

  const getStreamStatus = (post: BulletinPost) => {
    if (post.session_ended_at) return "ended";
    if (!post.scheduled_at) return "unknown";
    const scheduledTime = new Date(post.scheduled_at);
    if (isPast(scheduledTime)) return "live";
    return "upcoming";
  };

  const renderCard = (post: BulletinPost) => {
    const isPaid = post.is_paid_livestream;
    const hasEntered = enteredPosts.has(post.id);
    const totalCredits = (post.livestream_credits_per_minute || 1) * 3;
    const status = getStreamStatus(post);
    const countdown = countdowns[post.id];
    const isLive = status === "live";
    const isEnded = status === "ended";

    return (
      <Card key={post.id} className="bg-gray-800 border-gray-700 flex flex-col">
        {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
          <CardHeader className="p-0 relative">
            <img
              src={post.uploaded_image_url || post.image_url}
              alt={post.title}
              className="w-full h-48 object-fill rounded-t-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {isPaid && (
                <div className="bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  PAID
                </div>
              )}
              {isLive && (
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  LIVE
                </div>
              )}
              {status === "upcoming" && countdown && (
                <div className="bg-purple-600/90 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {countdown}
                </div>
              )}
            </div>
          </CardHeader>
        )}
        {post.video_url && post.media_type === 'video' && (
          <CardHeader className="p-0 relative">
            <video
              src={post.video_url}
              controls
              className="w-full h-48 object-cover rounded-t-lg"
              preload="metadata"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {isPaid && (
                <div className="bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  PAID
                </div>
              )}
              {isLive && (
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  LIVE
                </div>
              )}
            </div>
          </CardHeader>
        )}
        {!post.image_url && !post.uploaded_image_url && !post.video_url && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-2 flex justify-between items-center">
            <div className="flex gap-2">
              {isPaid && (
                <div className="bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  PAID
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isLive && (
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  LIVE
                </div>
              )}
              {status === "upcoming" && countdown && (
                <div className="bg-purple-600/90 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {countdown}
                </div>
              )}
            </div>
          </div>
        )}
        <CardContent className="p-4 flex flex-col flex-1">
          <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
          <p className="text-gray-300 text-sm mb-2 leading-relaxed line-clamp-3">{post.content}</p>
          
          {/* Scheduled Time Display */}
          {post.scheduled_at && (
            <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(post.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                {post.timezone && ` (${post.timezone.split('/')[1]?.replace('_', ' ')})`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
            <div className="flex items-center gap-2">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
              <Link 
                to={`/profile/${post.merchant_id}`}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {post.profiles?.display_name || 'Community'}
              </Link>
            </div>
          </div>

          <div className="mt-auto">
            {isEnded ? (
              <Button disabled size="sm" className="w-full bg-gray-600 cursor-not-allowed">
                Stream Ended
              </Button>
            ) : isPaid ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span>Entry: {totalCredits} credits</span>
                </div>
                <Button
                  onClick={() => hasEntered ? handleJoinRoom(post) : handleEnterStream(post)}
                  disabled={enteringStream || checkingEntries}
                  size="sm"
                  className={hasEntered 
                    ? "w-full bg-green-600 hover:bg-green-700" 
                    : "w-full bg-purple-600 hover:bg-purple-700"
                  }
                >
                  {enteringStream ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : hasEntered ? (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      {isLive ? "Join Stream" : "Enter Room"}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      {isLive ? "Pay & Join" : "Pay to Enter"}
                    </>
                  )}
                </Button>
              </div>
            ) : post.room_id ? (
              <Button
                onClick={() => handleJoinRoom(post)}
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Video className="w-4 h-4 mr-2" />
                {isLive ? "Join Stream" : "Enter Room"}
              </Button>
            ) : post.link_url && (
              <Button
                onClick={() => window.open(post.link_url!, '_blank', 'noopener,noreferrer')}
                size="sm"
                className="mb-4 bg-blue-600 hover:bg-blue-700 w-fit"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Watch Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-16 flex items-center gap-2">
        <Tv className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        TV Guide
      </h2>
      
      {useCarousel ? (
        <Carousel
          opts={{
            align: "start",
            loop: posts.length > 2,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-1">
            {hasNoPosts ? (
              <CarouselItem className="pl-1">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">No TV Guide entries yet. Check back soon!</p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ) : (
              posts.map((post) => (
                <CarouselItem key={post.id} className="pl-1 md:basis-1/3 lg:basis-1/4 xl:basis-1/4">
                  {renderCard(post)}
                </CarouselItem>
              ))
            )}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
      ) : (
        <div className="relative pt-14 pb-14">
          <Carousel
            opts={{
              align: "start",
              loop: posts.length > 1,
            }}
            className="w-full"
            orientation="vertical"
          >
            <CarouselContent className="h-[500px]">
              {hasNoPosts ? (
                <CarouselItem className="basis-auto py-1">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-400">No TV Guide entries yet. Check back soon!</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ) : (
                posts.map((post) => (
                  <CarouselItem key={post.id} className="basis-auto py-1">
                    {renderCard(post)}
                  </CarouselItem>
                ))
              )}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 -top-12 left-1/2 -translate-x-1/2 z-20 w-10 h-10" />
            <CarouselNext className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 -bottom-12 left-1/2 -translate-x-1/2 z-20 w-10 h-10" />
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default TVGuideSection;
