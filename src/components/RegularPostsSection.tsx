import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Calendar, ExternalLink, Shield } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";

interface RegularPostsSectionProps {
  posts: BulletinPost[];
  useCarousel?: boolean;
}

const RegularPostsSection = ({ posts, useCarousel = true }: RegularPostsSectionProps) => {
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

  const renderCard = (post: BulletinPost) => (
    <Card key={post.id} className="bg-gray-800 border-gray-700 flex flex-col">
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
      <CardContent className="p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-white text-lg">{post.title}</CardTitle>
          {post.profiles?.is_admin && (
            <Badge variant="secondary" className="bg-orange-600 text-white border-orange-500 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Admin Post
            </Badge>
          )}
        </div>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-4">{post.content}</p>
        
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
        </div>
        
        {post.link_url && (
          <button
            onClick={() => handleLinkClick(post.link_url)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mb-4 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Link
          </button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        Admin Posts
      </h2>
      
      {useCarousel ? (
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
                {renderCard(post)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
      ) : (
          <Carousel
            opts={{
              align: "start",
              loop: posts.length > 4,
            }}
            className="w-full"
            orientation="vertical"
          >
          <CarouselContent className="-mt-1 h-[600px]">
            {posts.map((post) => (
              <CarouselItem key={post.id} className="pt-1 basis-auto min-h-[400px]">
                {renderCard(post)}
              </CarouselItem>
            ))}
          </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 left-1/2 -translate-x-1/2 z-10" />
            <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 left-1/2 -translate-x-1/2 z-10" />
        </Carousel>
      )}
    </div>
  );
};

export default RegularPostsSection;