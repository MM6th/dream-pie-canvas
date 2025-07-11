import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Calendar, ExternalLink } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PostInteractions from "./PostInteractions";
import { BulletinPost } from "@/types/bulletin";
import { useNavigate } from "react-router-dom";

interface RegularPostsSectionProps {
  posts: BulletinPost[];
}

const RegularPostsSection = ({ posts }: RegularPostsSectionProps) => {
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
        <MessageSquare className="w-8 h-8 text-white" />
        Regular Posts
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
              <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
                {(post.image_url || post.uploaded_image_url) && (
                  <CardHeader className="p-0">
                    <img
                      src={post.uploaded_image_url || post.image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </CardHeader>
                )}
                <CardContent className="p-6 flex-grow flex flex-col">
                  <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-4 flex-grow">{post.content}</p>
                  
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
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mb-4 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Link
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

export default RegularPostsSection;