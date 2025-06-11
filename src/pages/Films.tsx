import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Play, Star, Calendar, Clock, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface FilmData {
  id: string;
  title: string;
  description: string;
  genre: string;
  rating: number;
  releaseYear: number;
  duration: string;
  director: string;
  thumbnailUrl: string;
  price: number;
  isFeatured: boolean;
}

const Films = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Dummy film data
  const films: FilmData[] = [
    {
      id: "1",
      title: "Neon Genesis",
      description: "A cyberpunk thriller set in a dystopian future where reality and virtual worlds collide.",
      genre: "Sci-Fi",
      rating: 8.7,
      releaseYear: 2024,
      duration: "2h 15m",
      director: "Alex Chen",
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop",
      price: 12.99,
      isFeatured: true
    },
    {
      id: "2",
      title: "Midnight in Tokyo",
      description: "A romantic drama following two strangers who meet during a blackout in downtown Tokyo.",
      genre: "Romance",
      rating: 7.8,
      releaseYear: 2023,
      duration: "1h 45m",
      director: "Yuki Tanaka",
      thumbnailUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=600&fit=crop",
      price: 9.99,
      isFeatured: false
    },
    {
      id: "3",
      title: "The Digital Frontier",
      description: "Documentary exploring the impact of artificial intelligence on modern society.",
      genre: "Documentary",
      rating: 9.1,
      releaseYear: 2024,
      duration: "1h 30m",
      director: "Sarah Mitchell",
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop",
      price: 7.99,
      isFeatured: false
    },
    {
      id: "4",
      title: "Ocean's Echo",
      description: "An underwater adventure following marine biologists discovering a new species.",
      genre: "Adventure",
      rating: 8.2,
      releaseYear: 2023,
      duration: "2h 5m",
      director: "Michael Rodriguez",
      thumbnailUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=600&fit=crop",
      price: 11.99,
      isFeatured: true
    },
    {
      id: "5",
      title: "Quantum Dreams",
      description: "A mind-bending thriller about a physicist who discovers parallel dimensions.",
      genre: "Thriller",
      rating: 8.9,
      releaseYear: 2024,
      duration: "2h 30m",
      director: "Emma Watson",
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=600&fit=crop",
      price: 14.99,
      isFeatured: true
    },
    {
      id: "6",
      title: "Silent Echoes",
      description: "A psychological drama about a deaf artist finding her voice through visual art.",
      genre: "Drama",
      rating: 7.6,
      releaseYear: 2023,
      duration: "1h 55m",
      director: "David Park",
      thumbnailUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=600&fit=crop",
      price: 8.99,
      isFeatured: false
    }
  ];

  const featuredFilms = films.filter(film => film.isFeatured);
  const regularFilms = films.filter(film => !film.isFeatured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          className="border-gray-600 text-white hover:bg-white hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button
          onClick={handleSignOut}
          className="bg-white text-black hover:bg-gray-100 hover:text-black"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Hero Section */}
      <div 
        className="relative h-96 bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=400&fit=crop')`
        }}
      >
        <div className="text-center text-white z-10">
          <h1 className="text-6xl font-bold mb-4 text-shadow-lg">Film Collection</h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto px-4">
            Discover extraordinary stories from independent filmmakers and acclaimed directors
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Featured Films Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-500" />
            Featured Films
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredFilms.map((film) => (
              <Card key={film.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 transform hover:scale-105">
                <CardHeader className="p-0">
                  <div className="relative">
                    <img
                      src={film.thumbnailUrl}
                      alt={film.title}
                      className="w-full h-64 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500 text-black font-bold">
                        Featured
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-semibold">{film.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-white text-xl mb-2">{film.title}</CardTitle>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{film.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-600">
                        {film.genre}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {film.releaseYear}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {film.duration}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">Directed by {film.director}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">${film.price}</span>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Play className="w-4 h-4 mr-2" />
                      Watch Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Films Section */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Film className="w-8 h-8" />
            All Films
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {regularFilms.map((film) => (
              <Card key={film.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
                <CardHeader className="p-0">
                  <div className="relative">
                    <img
                      src={film.thumbnailUrl}
                      alt={film.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span className="text-white text-sm font-semibold">{film.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-white text-lg mb-2 line-clamp-1">{film.title}</CardTitle>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{film.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-600 text-xs">
                      {film.genre}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{film.releaseYear}</span>
                      <span>•</span>
                      <span>{film.duration}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-white">${film.price}</span>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Play className="w-3 h-3 mr-1" />
                      Watch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Films;
