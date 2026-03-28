import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, User, Calendar, ExternalLink, Shield } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";
import ExpandableDescription from "./ui/ExpandableDescription";

interface AnnouncementPostsSectionProps {
  posts: BulletinPost[];
}

const AnnouncementPostsSection = ({ posts }: AnnouncementPostsSectionProps) => {
  const navigate = useNavigate();
  
  if (posts.length === 0) {
    return null;
  }

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <Megaphone className="w-8 h-8 text-white" />
        Announcements
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        orientation="vertical"
        className="w-full"
      >
        <CarouselContent className="-mt-4 h-[600px]">
          {posts.map((post) => (
            <CarouselItem key={post.id} className="pt-4">
              <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-700">
                {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
                  <CardHeader className="p-0">
                    <img
                      src={post.uploaded_image_url || post.image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-t-lg"
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
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                    <Badge className="bg-green-600 text-white text-xs">
                      OPPORTUNITY
                    </Badge>
                  </div>
                  
                  <ExpandableDescription description={post.content} maxLength={150} className="mb-4" />
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                     <div className="flex items-center gap-2">
                        {(post.post_type === 'announcement' || post.profiles?.is_admin) ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center" aria-label="Admin announcement">
                              <Shield className="w-4 h-4 text-white" />
                            </div>
                            <span className="sr-only">Admin</span>
                          </>
                        ) : (
                          <>
                            {post.profiles?.avatar_url ? (
                              <img
                                src={post.profiles.avatar_url}
                                alt="Avatar"
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
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
                      {post.scheduled_at && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Calendar className="w-3 h-3" />
                          <span>Scheduled: {new Date(post.scheduled_at).toLocaleDateString()} at {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {post.contract_type === 'live_challenges' && (
                        <Badge className="bg-purple-600 text-white text-xs">Live Challenge</Badge>
                      )}
                      {(post as any).challenge_type && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          {(post as any).challenge_type.replace('_', '-').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      )}
                  </div>

                  {/* Championship Belt for Title on the Line */}
                  {(post as any).title_on_the_line && (
                    <div className="flex justify-center my-4">
                      <div className="relative">
                        {/* Belt SVG */}
                        <svg width="200" height="80" viewBox="0 0 200 80" className="drop-shadow-lg">
                          {/* Belt straps */}
                          <rect x="0" y="28" width="40" height="24" rx="4" fill="#8B4513" stroke="#DAA520" strokeWidth="2"/>
                          <rect x="160" y="28" width="40" height="24" rx="4" fill="#8B4513" stroke="#DAA520" strokeWidth="2"/>
                          {/* Center plate */}
                          <rect x="35" y="10" width="130" height="60" rx="8" fill="url(#goldGradient)" stroke="#B8860B" strokeWidth="3"/>
                          {/* Inner plate detail */}
                          <rect x="50" y="22" width="100" height="36" rx="4" fill="url(#innerGold)" stroke="#DAA520" strokeWidth="1.5"/>
                          {/* Star */}
                          <polygon points="100,28 104,38 115,38 106,44 110,55 100,48 90,55 94,44 85,38 96,38" fill="#FFD700" stroke="#B8860B" strokeWidth="1"/>
                          {/* Side gems */}
                          <circle cx="60" cy="40" r="5" fill="#FF4444" stroke="#DAA520" strokeWidth="1.5"/>
                          <circle cx="140" cy="40" r="5" fill="#FF4444" stroke="#DAA520" strokeWidth="1.5"/>
                          {/* Belt holes */}
                          <circle cx="10" cy="40" r="3" fill="#2a1506"/>
                          <circle cx="22" cy="40" r="3" fill="#2a1506"/>
                          <circle cx="178" cy="40" r="3" fill="#2a1506"/>
                          <circle cx="190" cy="40" r="3" fill="#2a1506"/>
                          <defs>
                            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FFD700"/>
                              <stop offset="50%" stopColor="#FFA500"/>
                              <stop offset="100%" stopColor="#FFD700"/>
                            </linearGradient>
                            <linearGradient id="innerGold" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FFF8DC"/>
                              <stop offset="50%" stopColor="#FFD700"/>
                              <stop offset="100%" stopColor="#B8860B"/>
                            </linearGradient>
                          </defs>
                        </svg>
                        <p className="text-center text-yellow-400 font-bold text-sm mt-1">🏆 TITLE ON THE LINE 🏆</p>
                      </div>
                    </div>
                  )}
                  
                  {post.link_url && (
                    <button
                      onClick={() => handleLinkClick(post.link_url)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply Now
                    </button>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
      </Carousel>
    </div>
  );
};

export default AnnouncementPostsSection;