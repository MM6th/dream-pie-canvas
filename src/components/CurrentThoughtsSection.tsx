
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Waves, User, Calendar, Shield } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";
import PostInteractions from "./PostInteractions";
import ExpandableDescription from "./ui/ExpandableDescription";
import SixthPriceTag from "./SixthPriceTag";

interface CurrentThoughtsSectionProps {
  posts: BulletinPost[];
  useCarousel?: boolean;
}

const CurrentThoughtsSection = ({ posts, useCarousel = true }: CurrentThoughtsSectionProps) => {
  if (posts.length === 0) {
    return null;
  }

  const isSupporterPost = (post: BulletinPost) => {
    return post.profiles?.user_type === 'supporter';
  };

  const renderCard = (post: BulletinPost) => (
    <Card key={post.id} className="bg-gray-800 border-gray-700 flex flex-col min-h-[85vh]">
      {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
        <CardHeader className="p-0">
          <img
            src={post.uploaded_image_url || post.image_url}
            alt={post.title}
            className="w-full rounded-t-lg"
          />
        </CardHeader>
      )}
      {post.video_url && post.media_type === 'video' && (
        <CardHeader className="p-0">
          <video
            src={post.video_url}
            controls
            className="w-full h-48 object-cover rounded-t-lg"
            preload="metadata"
          />
        </CardHeader>
      )}
      <CardContent className="p-4 flex flex-col">
        {/* Only show title if not an announcement post */}
        {post.post_type !== 'announcement' && (
          <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
        )}
        <ExpandableDescription description={post.content} maxLength={150} className="mb-2" />

        {/* Live Challenge Badges */}
        {post.contract_type === 'live_challenges' && (
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className="bg-purple-600 text-white text-xs">Live Challenge</Badge>
            {post.challenge_type && (
              <Badge className="bg-blue-600 text-white text-xs">
                {post.challenge_type.replace('_', '-').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            )}
          </div>
        )}

        {/* Scheduled Date */}
        {post.scheduled_at && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 mb-2">
            <Calendar className="w-3 h-3" />
            <span>Scheduled: {new Date(post.scheduled_at).toLocaleDateString()} at {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        {/* Championship Belt for Title on the Line */}
        {post.title_on_the_line && (
          <div className="flex justify-center my-3">
            <div className="relative flex flex-col items-center">
              {post.champion_profile && (
                <div className="mb-2 flex flex-col items-center">
                  <Avatar className="h-14 w-14 border-2 border-yellow-500 shadow-lg shadow-yellow-500/30">
                    <AvatarImage src={post.champion_profile.avatar_url || ''} />
                    <AvatarFallback className="bg-yellow-600 text-white text-sm font-bold">
                      {(post.champion_profile.display_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-yellow-400 text-xs font-semibold mt-1">
                    {post.champion_profile.display_name}
                  </p>
                </div>
              )}
              <svg width="160" height="64" viewBox="0 0 200 80" className="drop-shadow-lg">
                <rect x="0" y="28" width="40" height="24" rx="4" fill="#8B4513" stroke="#DAA520" strokeWidth="2"/>
                <rect x="160" y="28" width="40" height="24" rx="4" fill="#8B4513" stroke="#DAA520" strokeWidth="2"/>
                <rect x="35" y="10" width="130" height="60" rx="8" fill="url(#goldGradientCurrent)" stroke="#B8860B" strokeWidth="3"/>
                <rect x="50" y="22" width="100" height="36" rx="4" fill="url(#innerGoldCurrent)" stroke="#DAA520" strokeWidth="1.5"/>
                <polygon points="100,28 104,38 115,38 106,44 110,55 100,48 90,55 94,44 85,38 96,38" fill="#FFD700" stroke="#B8860B" strokeWidth="1"/>
                <circle cx="60" cy="40" r="5" fill="#FF4444" stroke="#DAA520" strokeWidth="1.5"/>
                <circle cx="140" cy="40" r="5" fill="#FF4444" stroke="#DAA520" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="goldGradientCurrent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#FFA500"/>
                    <stop offset="100%" stopColor="#FFD700"/>
                  </linearGradient>
                  <linearGradient id="innerGoldCurrent" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFF8DC"/>
                    <stop offset="50%" stopColor="#FFD700"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                </defs>
              </svg>
              <p className="text-center text-yellow-400 font-bold text-xs mt-1">🏆 TITLE ON THE LINE 🏆</p>
            </div>
          </div>
        )}

        {/* Purse Amounts */}
        {post.contract_type === 'live_challenges' && (post.challenger1_purse || post.challenger2_purse || post.champion_purse) && (
          <div className="bg-gray-900/60 rounded-lg p-2 my-2 border border-gray-600">
            <p className="text-white font-semibold text-xs mb-1">💰 Purse</p>
            {post.title_on_the_line ? (
              <div className="space-y-1">
                {(post.challenger1_purse ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Challenger:</span>
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      ${post.challenger1_purse?.toLocaleString()}
                      <SixthPriceTag usdPrice={post.challenger1_purse!} size="sm" />
                    </span>
                  </div>
                )}
                {(post.champion_purse ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-300">Champion:</span>
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      ${post.champion_purse?.toLocaleString()}
                      <SixthPriceTag usdPrice={post.champion_purse!} size="sm" />
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {(post.challenger1_purse ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Challenger 1:</span>
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      ${post.challenger1_purse?.toLocaleString()}
                      <SixthPriceTag usdPrice={post.challenger1_purse!} size="sm" />
                    </span>
                  </div>
                )}
                {(post.challenger2_purse ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Challenger 2:</span>
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      ${post.challenger2_purse?.toLocaleString()}
                      <SixthPriceTag usdPrice={post.challenger2_purse!} size="sm" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Time Limit */}
        {post.contract_type === 'live_challenges' && (post.challenge_time_limit_minutes ?? 0) > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground my-1">
            <span>⏱️</span>
            <span className="font-medium">
              Time Limit: {Math.floor(post.challenge_time_limit_minutes! / 60) > 0 ? `${Math.floor(post.challenge_time_limit_minutes! / 60)}h ` : ''}{post.challenge_time_limit_minutes! % 60 > 0 ? `${post.challenge_time_limit_minutes! % 60}m` : ''}
            </span>
          </div>
        )}

        {/* Image disclaimer for live challenges */}
        {post.contract_type === 'live_challenges' && (post.image_url || post.uploaded_image_url) && (
          <p className="text-xs text-muted-foreground italic text-center my-1">Image for illustration only — actual event may differ</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
           <div className="flex items-center gap-2">
               {post.post_type === 'announcement' ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center" aria-label="Admin announcement">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="sr-only">Admin</span>
                </>
              ) : (
                <>
                  <Link to={`/profile/${post.merchant_id}`}>
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                      />
                    ) : (
                      <User className="w-6 h-6 cursor-pointer hover:text-white transition-colors" />
                    )}
                  </Link>
                  <Link 
                    to={`/profile/${post.merchant_id}`}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {post.profiles?.display_name || 'Community'}
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString()}
            </div>
        </div>
        <div className="mt-2">
          <PostInteractions postId={post.id} recipientId={post.merchant_id} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-16 flex items-center gap-2">
        <Waves className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        Current
      </h2>
      
      {useCarousel ? (
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {posts.map((post) => (
              <CarouselItem key={post.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                {renderCard(post)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
      ) : (
        <div className="h-[500px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent touch-pan-y">
          {posts.map((post) => renderCard(post))}
        </div>
      )}
    </div>
  );
};

export default CurrentThoughtsSection;
