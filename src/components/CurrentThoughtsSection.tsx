
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Calendar } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import PostInteractions from "./PostInteractions";
import { BulletinPost } from "@/types/bulletin";

interface CurrentThoughtsSectionProps {
  posts: BulletinPost[];
  useCarousel?: boolean;
}

const CurrentThoughtsSection = ({ posts, useCarousel = true }: CurrentThoughtsSectionProps) => {
  if (posts.length === 0) {
    return null;
  }

  const renderCard = (post: BulletinPost) => (
    <Card key={post.id} className="bg-gray-800 border-gray-700 h-full flex flex-col">
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
      <CardContent className="p-6 flex-grow flex flex-col">
        <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-4 flex-grow">{post.content}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
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
               <Link 
                 to={`/profile/${post.merchant_id}`}
                 className="text-gray-300 hover:text-white transition-colors"
               >
                 {post.profiles?.display_name || 'Community'}
               </Link>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString()}
            </div>
        </div>
        
        <div className="mt-auto">
          <PostInteractions postId={post.id} disableComments={true} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        Current Thoughts
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
            loop: posts.length > 1,
          }}
          className="w-full"
          orientation="vertical"
        >
          <CarouselContent className="-mt-4 h-[600px]">
            {posts.map((post) => (
              <CarouselItem key={post.id} className="pt-4 basis-full">
                {renderCard(post)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 top-2 left-1/2 -translate-x-1/2 rotate-90" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 bottom-2 left-1/2 -translate-x-1/2 rotate-90" />
        </Carousel>
      )}
    </div>
  );
};

export default CurrentThoughtsSection;
