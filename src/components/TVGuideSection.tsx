
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Tv, User } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";

interface TVGuideSectionProps {
  posts: BulletinPost[];
  useCarousel?: boolean;
}

const TVGuideSection = ({ posts, useCarousel = true }: TVGuideSectionProps) => {
  const navigate = useNavigate();

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const hasNoPosts = posts.length === 0;

  const renderCard = (post: BulletinPost) => (
    <Card key={post.id} className="bg-gray-800 border-gray-700 flex flex-col">
      {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
        <CardHeader className="p-0">
          <img
            src={post.uploaded_image_url || post.image_url}
            alt={post.title}
            className="w-full h-48 object-fill rounded-t-lg"
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

        {post.link_url && (
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

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-16 flex items-center gap-2">
        <Tv className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        TV Guide
      </h2>
      
      {hasNoPosts ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No TV Guide entries yet. Check back soon!</p>
        </div>
      ) : useCarousel ? (
        <Carousel
          opts={{
            align: "start",
            loop: posts.length > 2,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-1">
            {posts.map((post) => (
              <CarouselItem key={post.id} className="pl-1 md:basis-1/3 lg:basis-1/4 xl:basis-1/4">
                {renderCard(post)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
      ) : (
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: posts.length > 1,
            }}
            className="w-full"
            orientation="vertical"
          >
            <CarouselContent className="-mt-2 h-[800px]">
              {posts.map((post) => (
                <CarouselItem key={post.id} className="pt-2 basis-1/3">
                  {renderCard(post)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 top-4 left-1/2 -translate-x-1/2 rotate-90 z-10" />
            <CarouselNext className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 bottom-4 left-1/2 -translate-x-1/2 rotate-90 z-10" />
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default TVGuideSection;
