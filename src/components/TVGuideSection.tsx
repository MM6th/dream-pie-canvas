
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Tv, User } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PostInteractions from "./PostInteractions";
import { useNavigate } from "react-router-dom";

// This interface is duplicated from BulletinBoard.tsx. Consider moving to a shared types file.
interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  post_type?: string;
  created_at: string;
  merchant_id: string;
  profiles?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface TVGuideSectionProps {
  posts: BulletinPost[];
}

const TVGuideSection = ({ posts }: TVGuideSectionProps) => {
  const navigate = useNavigate();

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <Tv className="w-8 h-8 text-white" />
        TV Guide
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
            <CarouselItem key={post.id} className="pl-4 md:basis-1/2 lg:basis-1/2 xl:basis-1/3">
              <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
                {post.image_url && (
                  <CardHeader className="p-0">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </CardHeader>
                )}
                <CardContent className="p-6 flex-grow flex flex-col">
                  <CardTitle className="text-white text-xl mb-2">{post.title}</CardTitle>
                  <p className="text-gray-300 text-base mb-4 leading-relaxed line-clamp-3 flex-grow">{post.content}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
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
                        {post.profiles?.display_name || post.profiles?.email || 'Community'}
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

export default TVGuideSection;
