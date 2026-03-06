
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Calendar, Shield } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BulletinPost } from "@/types/bulletin";
import PostInteractions from "./PostInteractions";
import ExpandableDescription from "./ui/ExpandableDescription";

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
        {/* Only show title if not an announcement post */}
        {post.post_type !== 'announcement' && (
          <CardTitle className="text-white text-lg mb-2">{post.title}</CardTitle>
        )}
        <ExpandableDescription description={post.content} maxLength={150} className="mb-2" />
        
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
          <PostInteractions postId={post.id} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mb-12">
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-16 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        Current Affirmations
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
        <div className="relative pt-14 pb-14">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
            orientation="vertical"
          >
            <CarouselContent className="h-[500px]">
              {posts.map((post) => (
                <CarouselItem key={post.id} className="basis-auto py-1">
                  {renderCard(post)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 -top-12 left-1/2 -translate-x-1/2 z-20 w-10 h-10" />
            <CarouselNext className="text-white bg-gray-800/90 hover:bg-gray-700 border-gray-600 -bottom-12 left-1/2 -translate-x-1/2 z-20 w-10 h-10" />
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default CurrentThoughtsSection;
