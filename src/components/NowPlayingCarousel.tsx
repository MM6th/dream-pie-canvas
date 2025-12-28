import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface FilmWithCover {
  id: string;
  title: string;
  description: string | null;
  cover_photo_url: string;
  price: number | null;
  is_free: boolean;
  genres: string[];
}

interface NowPlayingCarouselProps {
  films: FilmWithCover[];
  onFilmClick?: (filmId: string) => void;
}

const NowPlayingCarousel = ({ films, onFilmClick }: NowPlayingCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (films.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 bg-primary rounded-full" />
        <h2 className="text-2xl font-bold text-white tracking-wide">Now Playing</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent ml-4" />
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: films.length > 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {films.map((film, index) => (
            <CarouselItem key={film.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/2">
              <div 
                className="relative group cursor-pointer overflow-hidden rounded-xl"
                onClick={() => onFilmClick?.(film.id)}
              >
                {/* Cover Image */}
                <div className="relative aspect-[21/9] w-full">
                  <img
                    src={film.cover_photo_url}
                    alt={film.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-end justify-between">
                      <div className="flex-1 mr-4">
                        {/* Genres */}
                        {film.genres && film.genres.length > 0 && (
                          <div className="flex gap-2 mb-2">
                            {film.genres.slice(0, 3).map((genre, i) => (
                              <span 
                                key={i} 
                                className="text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary-foreground border border-primary/50"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Title */}
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-1">
                          {film.title}
                        </h3>
                        
                        {/* Description */}
                        {film.description && (
                          <p className="text-sm text-gray-300 line-clamp-2 max-w-lg">
                            {film.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Price Badge */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg font-bold text-white bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                          {film.is_free ? "Free" : `$${film.price?.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle indicator removed - section header already says "Now Playing" */}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {films.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white" />
            <CarouselNext className="right-4 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default NowPlayingCarousel;
