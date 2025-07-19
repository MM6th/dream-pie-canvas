import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, User, Calendar, ExternalLink, DollarSign, Users } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PostInteractions from "./PostInteractions";
import { BulletinPost } from "@/types/bulletin";
import { useNavigate } from "react-router-dom";

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
        Announcements & Opportunities
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: posts.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {posts.map((post) => (
            <CarouselItem key={post.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-700 h-full flex flex-col">
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
                <CardContent className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                    <Badge className="bg-green-600 text-white text-xs">
                      OPPORTUNITY
                    </Badge>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-3 flex-grow">{post.content}</p>
                  
                  {/* Contract Details - you may need to extend the BulletinPost type if these fields exist */}
                  <div className="bg-gray-800/50 p-3 rounded-lg mb-4 space-y-2">
                    <h4 className="text-sm font-semibold text-green-300">Contract Details:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Revenue Share Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>Limited Positions</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                     <div className="flex items-center gap-2">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        {post.profiles?.display_name || 'Community'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                  </div>
                  
                  {post.link_url && (
                    <button
                      onClick={() => handleLinkClick(post.link_url)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg mb-4 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply Now
                    </button>
                  )}
                  
                  <div className="mt-auto">
                    <PostInteractions postId={post.id} />
                  </div>
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