import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowLeft, Users, User, Shield, Building, Search, MessageSquare, Calendar, LogOut, ShoppingBag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  user_type: string;
  is_admin?: boolean;
  is_adult_creator?: boolean;
  business_name?: string;
  created_at: string;
}

const ProfilesDirectory = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, selectedFilter]);

  const fetchProfiles = async () => {
    try {
      // Fetch only non-sensitive public profile fields
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          avatar_url,
          user_type,
          is_adult_creator,
          business_name,
          business_description,
          website,
          facebook_url,
          instagram_url,
          youtube_url,
          snapchat_url,
          pinterest_url,
          onlyfans_url,
          background_image_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        toast.error("Failed to load profiles");
        return;
      }

      // Fetch admin status from user_roles table
      if (data && data.length > 0) {
        const profileIds = data.map(p => p.id);
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .in('user_id', profileIds);

        const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);

        // Add is_admin flag to profiles for display
        const profilesWithAdmin = data.map(profile => ({
          ...profile,
          is_admin: adminIds.has(profile.id)
        }));

        setProfiles(profilesWithAdmin);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = profiles;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(profile =>
        (profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (profile.business_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (selectedFilter !== "all") {
      filtered = filtered.filter(profile => {
        switch (selectedFilter) {
          case "merchants":
            return profile.user_type === "merchant";
          case "supporters":
            return profile.user_type === "supporter";
          case "admins":
            return profile.is_admin === true;
          case "creators":
            return profile.is_adult_creator === true;
          default:
            return true;
        }
      });
    }

    setFilteredProfiles(filtered);
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleStoreView = () => {
    navigate('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('navigateToStore'));
    }, 100);
  };


  const handleBulletinView = () => {
    navigate('/bulletin');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Main Navigation */}
          <div className={`flex gap-2 ${isMobile ? 'flex-wrap w-full' : ''}`}>
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ArrowLeft className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Dashboard' : 'Back to Dashboard'}
            </Button>
            <Button
              onClick={handleStoreView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ShoppingBag className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Store' : 'Browse Store'}
            </Button>
            <Button
              onClick={handleBulletinView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Bulletin' : 'Browse Bulletin'}
            </Button>
          </div>
          
          {/* Sign Out Button */}
          <Button
            onClick={handleSignOut}
            className={`bg-white text-black hover:bg-gray-100 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full sm:w-auto' : ''}`}
          >
            <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Users className="w-8 h-8" />
            Community Profiles
          </h1>
          <p className="text-gray-300">Discover and connect with our community members</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4 max-w-3xl mx-auto">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { key: "all", label: "All", icon: Users },
              { key: "merchants", label: "Merchants", icon: Building },
              { key: "supporters", label: "Supporters", icon: User },
              { key: "admins", label: "Admins", icon: Shield },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => setSelectedFilter(key)}
                variant={selectedFilter === key ? "default" : "outline"}
                size="sm"
                className={`${
                  selectedFilter === key
                    ? "bg-blue-600 text-white"
                    : "border-gray-600 text-white bg-transparent hover:bg-gray-700"
                } ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <Icon className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {label}
              </Button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-center">
            <p className="text-gray-400">
              Showing {filteredProfiles.length} of {profiles.length} profiles
            </p>
          </div>
        </div>

        {/* Desktop: Ad + Carousel + Ad Layout / Mobile: Simple Grid */}
        {isMobile ? (
          // Mobile: Simple grid, no ads
          <div className="max-w-2xl mx-auto">
            {filteredProfiles.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No profiles found matching your criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredProfiles.map((profile) => (
                  <Card
                    key={profile.id}
                    className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer group"
                    onClick={() => handleProfileClick(profile.id)}
                  >
                    <CardContent className="p-4 text-center h-[240px] flex flex-col justify-between">
                      {/* Avatar */}
                      <div className="mb-4">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-gray-600 group-hover:border-gray-500 transition-colors"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto border-2 border-gray-600 group-hover:border-gray-500 transition-colors">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-white font-semibold mb-2 group-hover:text-blue-300 transition-colors">
                        {profile.display_name || 'Anonymous User'}
                      </h3>

                      {/* Business Name */}
                      {profile.business_name && (
                        <p className="text-gray-400 text-sm mb-2">{profile.business_name}</p>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap justify-center gap-1 mb-3">
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          {profile.user_type === 'merchant' ? 'Merchant' : 'Supporter'}
                        </Badge>
                        {profile.is_admin && (
                          <Badge variant="secondary" className="bg-orange-600 text-white text-xs flex items-center gap-1">
                            <Shield className="w-2 h-2" />
                            Admin
                          </Badge>
                        )}
                        {profile.is_adult_creator && (
                          <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                            Creator
                          </Badge>
                        )}
                      </div>

                      {/* Join Date */}
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Desktop: Left Ad + Carousel + Right Ad
          <div className="flex gap-6 justify-center items-start">
            {/* Left Ad Space */}
            <div className="w-48 flex-shrink-0">
              <div className="sticky top-4">
                <div 
                  className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-purple-600 transition-colors"
                  onClick={() => toast.info("Ad placements will be available soon!")}
                >
                  <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                </div>
              </div>
            </div>

            {/* Main Content - Carousel */}
            <div className="max-w-3xl w-full">
              {filteredProfiles.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No profiles found matching your criteria</p>
                  </CardContent>
                </Card>
              ) : (
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {filteredProfiles.map((profile) => (
                      <CarouselItem key={profile.id} className="pl-4 basis-1/3">
                        <Card
                          className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer group"
                          onClick={() => handleProfileClick(profile.id)}
                        >
                          <CardContent className="p-4 text-center h-[240px] flex flex-col justify-between">
                            {/* Avatar */}
                            <div className="mb-4">
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt={profile.display_name}
                                  className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-gray-600 group-hover:border-gray-500 transition-colors"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto border-2 border-gray-600 group-hover:border-gray-500 transition-colors">
                                  <User className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Name */}
                            <h3 className="text-white font-semibold mb-2 group-hover:text-blue-300 transition-colors line-clamp-1">
                              {profile.display_name || 'Anonymous User'}
                            </h3>

                            {/* Business Name */}
                            {profile.business_name && (
                              <p className="text-gray-400 text-sm mb-2 line-clamp-1">{profile.business_name}</p>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap justify-center gap-1 mb-3">
                              <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                                {profile.user_type === 'merchant' ? 'Merchant' : 'Supporter'}
                              </Badge>
                              {profile.is_admin && (
                                <Badge variant="secondary" className="bg-orange-600 text-white text-xs flex items-center gap-1">
                                  <Shield className="w-2 h-2" />
                                  Admin
                                </Badge>
                              )}
                              {profile.is_adult_creator && (
                                <Badge variant="secondary" className="bg-purple-600 text-white text-xs">
                                  Creator
                                </Badge>
                              )}
                            </div>

                            {/* Join Date */}
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="text-white border-gray-600 hover:bg-gray-700" />
                  <CarouselNext className="text-white border-gray-600 hover:bg-gray-700" />
                </Carousel>
              )}
            </div>

            {/* Right Ad Space */}
            <div className="w-48 flex-shrink-0">
              <div className="sticky top-4">
                <div 
                  className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-blue-600 transition-colors"
                  onClick={() => toast.info("Ad placements will be available soon!")}
                >
                  <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilesDirectory;