
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Tv, User, Video, Coins, Loader2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";
import { useAuth } from "@/hooks/useAuth";
import { useLivestreamEntry } from "@/hooks/useLivestreamEntry";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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

  useEffect(() => {
    if (user) {
      checkExistingEntries();
    } else {
      setCheckingEntries(false);
    }
  }, [user, posts]);

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

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
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

    const totalCredits = (post.livestream_credits_per_minute || 5) * 20;
    
    if (balance < totalCredits && !enteredPosts.has(post.id)) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${totalCredits} credits to enter. You have ${balance}.`,
        variant: "destructive",
      });
      onNeedsCredits?.();
      return;
    }

    const result = await enterLivestream(post.id, post.link_url || '');
    if (result.success) {
      setEnteredPosts(prev => new Set(prev).add(post.id));
      refetchBalance();
    }
  };

  const hasNoPosts = posts.length === 0;

  const renderCard = (post: BulletinPost) => {
    const isPaid = post.is_paid_livestream;
    const hasEntered = enteredPosts.has(post.id);
    const totalCredits = (post.livestream_credits_per_minute || 5) * 20;

    return (
      <Card key={post.id} className="bg-gray-800 border-gray-700 flex flex-col">
        {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
          <CardHeader className="p-0 relative">
            <img
              src={post.uploaded_image_url || post.image_url}
              alt={post.title}
              className="w-full h-48 object-fill rounded-t-lg"
            />
            {isPaid && (
              <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <Video className="w-3 h-3" />
                PAID STREAM
              </div>
            )}
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
            {isPaid && (
              <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <Video className="w-3 h-3" />
                PAID STREAM
              </div>
            )}
          </CardHeader>
        )}
        {!post.image_url && !post.uploaded_image_url && !post.video_url && isPaid && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-2 flex justify-end">
            <div className="bg-yellow-500/90 text-black text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <Video className="w-3 h-3" />
              PAID STREAM
            </div>
          </div>
        )}
        <CardContent className="p-4 flex flex-col">
          <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
          <p className="text-gray-300 text-sm mb-2 leading-relaxed line-clamp-3">{post.content}</p>
          
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
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.created_at).toLocaleDateString()}
            </div>
          </div>

          {isPaid ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <Coins className="w-4 h-4" />
                <span>Entry: {totalCredits} credits</span>
              </div>
              <Button
                onClick={() => handleEnterStream(post)}
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
                    Entering...
                  </>
                ) : hasEntered ? (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Re-enter Stream
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Enter Stream
                  </>
                )}
              </Button>
            </div>
          ) : post.link_url && (
            <Button
              onClick={() => handleLinkClick(post.link_url!)}
              size="sm"
              className="mb-4 bg-blue-600 hover:bg-blue-700 w-fit"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Watch Now
            </Button>
          )}
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
