import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowLeft, Users, User, Shield, Building, Search, MessageSquare, Calendar, DollarSign, Cake, Star, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBlockUser } from "@/hooks/useBlockUser";
import { getZodiacSign, calculateAge } from "@/utils/zodiacUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import AppNavBar from "@/components/AppNavBar";
import { supabase } from "@/integrations/supabase/client";
import UserStatsDisplay from "@/components/UserStatsDisplay";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SixthPriceTag from "@/components/SixthPriceTag";
import FollowButton from "@/components/profile/FollowButton";
import type { FollowStatus } from "@/hooks/useFollowRequest";

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  user_type: string;
  is_admin?: boolean;
  is_adult_creator?: boolean;
  business_name?: string;
  created_at: string;
  skills?: string[];
  date_of_birth?: string;
  show_age?: boolean;
  show_zodiac_sign?: boolean;
  industry?: string;
}

const ProfilesDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  
  const isActivePage = (path: string) => location.pathname === path;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [messagingPrices, setMessagingPrices] = useState<Record<string, number>>({});
  const [followStatuses, setFollowStatuses] = useState<Record<string, FollowStatus>>({});
  const { blockedIds, isBlocked, blockUser, unblockUser } = useBlockUser(user?.id);

  useEffect(() => {
    fetchProfiles();
    fetchMessagingPrices();
  }, []);

  useEffect(() => {
    if (user && profiles.length > 0) {
      fetchFollowStatuses();
    }
  }, [user, profiles]);

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
          created_at,
          skills,
          date_of_birth,
          show_age,
          show_zodiac_sign,
          industry
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

  const fetchMessagingPrices = async () => {
    try {
      const { data } = await supabase
        .from('message_settings')
        .select('merchant_id, credits_per_message, enabled')
        .eq('enabled', true);
      if (data) {
        const prices: Record<string, number> = {};
        data.forEach(s => { prices[s.merchant_id] = s.credits_per_message; });
        setMessagingPrices(prices);
      }
    } catch (error) {
      console.error('Error fetching messaging prices:', error);
    }
  };

  const fetchFollowStatuses = async () => {
    if (!user) return;
    try {
      // Check which profiles the user is already following
      const profileIds = profiles.map(p => p.id).filter(id => id !== user.id);
      
      const [followersResult, requestsResult] = await Promise.all([
        supabase
          .from('profile_followers')
          .select('merchant_id')
          .eq('follower_id', user.id)
          .in('merchant_id', profileIds),
        supabase
          .from('profile_follow_requests')
          .select('target_merchant_id')
          .eq('requester_id', user.id)
          .eq('status', 'pending')
          .in('target_merchant_id', profileIds),
      ]);

      const statuses: Record<string, FollowStatus> = {};
      followersResult.data?.forEach(f => { statuses[f.merchant_id] = 'following'; });
      requestsResult.data?.forEach(r => { 
        if (!statuses[r.target_merchant_id]) statuses[r.target_merchant_id] = 'pending'; 
      });
      setFollowStatuses(statuses);
    } catch (error) {
      console.error('Error fetching follow statuses:', error);
    }
  };

  const filterProfiles = () => {
    let filtered = profiles;

    // Filter by search term - context-aware based on selected filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      if (selectedFilter === "supporters" || selectedFilter === "merchants") {
        // When viewing supporters or merchants, search by name only
        filtered = filtered.filter(profile =>
          profile.display_name?.toLowerCase().includes(searchLower) ||
          profile.business_name?.toLowerCase().includes(searchLower)
        );
      } else {
        // Default: search skills/industries, names, and user type
        filtered = filtered.filter(profile => {
          const skillMatch = profile.skills?.some(skill => 
            skill.toLowerCase().includes(searchLower)
          );
          const nameMatch = profile.display_name?.toLowerCase().includes(searchLower) ||
            profile.business_name?.toLowerCase().includes(searchLower);
          const typeMatch = profile.user_type?.toLowerCase().includes(searchLower);
          
          return skillMatch || nameMatch || typeMatch;
        });
      }
    }

    // Filter by type (only if a filter is selected)
    if (selectedFilter) {
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
          case "industries":
            return profile.skills && profile.skills.length > 0;
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
  const handleBlockToggle = async (profileId: string, profileName: string) => {
    if (isBlocked(profileId)) {
      await unblockUser(profileId);
    } else {
      await blockUser(profileId);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-x-hidden">
      <AppNavBar />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Users className="w-8 h-8" />
            Trending
          </h1>
          <p className="text-gray-300">Search for skill sets, and see what's trending on profile playlists</p>
        </div>

        {/* User Stats */}
        <UserStatsDisplay />

        {/* Search and Filters */}
        <div className="mb-8 space-y-4 max-w-3xl mx-auto">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={
                selectedFilter === "supporters" || selectedFilter === "merchants"
                  ? "Search by name"
                  : "Search industries"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  // Clear filter to show search results
                  setSelectedFilter(null);
                }
              }}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-2 items-center">
            {(selectedFilter || searchTerm.trim()) && (
              <Button
                onClick={() => {
                  setSelectedFilter(null);
                  setSearchTerm("");
                }}
                variant="outline"
                size="sm"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <ArrowLeft className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                Trending
              </Button>
            )}
            {[
              { key: "merchants", label: "Merchants", icon: Building },
              { key: "supporters", label: "Supporters", icon: User },
              { key: "industries", label: "Skills", icon: Building },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => setSelectedFilter(selectedFilter === key ? null : key)}
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

        </div>

        {/* Desktop: Outer Arrows + Ad + Carousel + Ad + Outer Arrows / Mobile: Simple Grid */}
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
                    <CardContent className="p-4 text-center h-[280px] flex flex-col justify-between">
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
                      <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors line-clamp-1">
                        {profile.display_name || 'Anonymous User'}
                      </h3>


                      {/* Badges */}
                      <div className="flex flex-wrap justify-center gap-1 mb-2">
                        {profile.user_type === 'merchant' && profile.industry && (
                          <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                            {profile.industry}
                          </Badge>
                        )}
                        {profile.is_admin && profile.id !== 'cedd3262-be80-4af4-9675-c081107cecb5' && (
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
                      
                      {/* Skills - Separate row */}
                      {profile.skills && profile.skills.length > 0 && 
                       selectedFilter === "industries" && (
                        <div className="flex flex-wrap justify-center gap-1 mb-2 min-h-[20px]">
                          {profile.skills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px] px-2 py-0">
                              {skill}
                            </Badge>
                          ))}
                          {profile.skills.length > 2 && (
                            <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px] px-2 py-0">
                              +{profile.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Age & Zodiac */}
                      {profile.date_of_birth && (profile.show_age || profile.show_zodiac_sign) && (
                        <div className="flex flex-wrap justify-center gap-1 mb-1">
                          {profile.show_age && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0 flex items-center gap-0.5">
                              <Cake className="w-2.5 h-2.5" />
                              {calculateAge(profile.date_of_birth)}
                            </Badge>
                          )}
                          {profile.show_zodiac_sign && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] px-2 py-0">
                              {getZodiacSign(profile.date_of_birth).split(' ')[1]}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Messaging Price */}
                      {messagingPrices[profile.id] && (
                        <div className="flex flex-col items-center gap-0.5 text-xs text-green-400 mb-1">
                          <span className="text-green-300 font-medium">${(messagingPrices[profile.id] * 0.10).toFixed(2)}/msg</span>
                          <div className="flex items-center gap-1 text-[10px] text-green-300/80 flex-wrap justify-center">
                            <span>{messagingPrices[profile.id]} {messagingPrices[profile.id] === 1 ? 'credit' : 'credits'}</span>
                            <span>•</span>
                            <SixthPriceTag usdPrice={messagingPrices[profile.id] * 0.10} size="sm" showUsd={false} />
                          </div>
                        </div>
                      )}

                      {/* Follow Button */}
                      {user && user.id !== profile.id && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <FollowButton
                            targetUserId={profile.id}
                            targetUserName={profile.display_name || 'User'}
                            followStatus={followStatuses[profile.id] || 'none'}
                            onRequestSent={() => fetchFollowStatuses()}
                            className="w-full text-xs h-7"
                          />
                        </div>
                      )}

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
          // Desktop: Show ads when no filter, show profiles when filter selected
          <div className="relative max-w-[1200px] mx-auto px-20">
            {/* Outer Left Arrow */}
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 flex items-center justify-center transition-colors"
              onClick={() => toast.info("Navigation coming soon!")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>

            {/* Outer Right Arrow */}
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 flex items-center justify-center transition-colors"
              onClick={() => toast.info("Navigation coming soon!")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            {selectedFilter === null && !searchTerm.trim() ? (
              // Show Ad Spaces when no filter is selected and no search term
              <div className="flex gap-8 justify-center items-start">
                <div className="w-48 flex-shrink-0">
                  <div className="sticky top-4">
                    <div 
                      className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-purple-600 transition-colors pointer-events-auto"
                      onClick={() => toast.info("Ad placements will be available soon!")}
                    >
                      <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                    </div>
                  </div>
                </div>

                <div className="w-48 flex-shrink-0">
                  <div className="sticky top-4">
                    <div 
                      className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-green-600 transition-colors pointer-events-auto"
                      onClick={() => toast.info("Ad placements will be available soon!")}
                    >
                      <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                    </div>
                  </div>
                </div>

                <div className="w-48 flex-shrink-0">
                  <div className="sticky top-4">
                    <div 
                      className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border border-orange-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-orange-600 transition-colors pointer-events-auto"
                      onClick={() => toast.info("Ad placements will be available soon!")}
                    >
                      <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                    </div>
                  </div>
                </div>

                <div className="w-48 flex-shrink-0">
                  <div className="sticky top-4">
                    <div 
                      className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700 rounded-lg p-4 h-96 flex items-center justify-center cursor-pointer hover:border-blue-600 transition-colors pointer-events-auto"
                      onClick={() => toast.info("Ad placements will be available soon!")}
                    >
                      <p className="text-gray-400 text-center text-sm">Ad Space<br/>300x600</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Show Profile Cards when a filter is selected
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProfiles.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-8 text-center">
                        <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No profiles found matching your criteria</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filteredProfiles.map((profile) => (
                    <Card
                      key={profile.id}
                      className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer group"
                      onClick={() => handleProfileClick(profile.id)}
                    >
                      <CardContent className="p-4 text-center h-[280px] flex flex-col justify-between">
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

                        <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors line-clamp-1">
                          {profile.display_name || 'Anonymous User'}
                        </h3>


                        <div className="flex flex-wrap justify-center gap-1 mb-2">
                          {profile.user_type === 'merchant' && profile.industry && (
                            <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                              {profile.industry}
                            </Badge>
                          )}
                          {profile.is_admin && profile.id !== 'cedd3262-be80-4af4-9675-c081107cecb5' && (
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
                        
                        {profile.skills && profile.skills.length > 0 && 
                         selectedFilter === "industries" && (
                          <div className="flex flex-wrap justify-center gap-1 mb-2 min-h-[20px]">
                            {profile.skills.slice(0, 2).map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px] px-2 py-0">
                                {skill}
                              </Badge>
                            ))}
                            {profile.skills.length > 2 && (
                              <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px] px-2 py-0">
                                +{profile.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Age & Zodiac */}
                        {profile.date_of_birth && (profile.show_age || profile.show_zodiac_sign) && (
                          <div className="flex flex-wrap justify-center gap-1 mb-1">
                            {profile.show_age && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0 flex items-center gap-0.5">
                                <Cake className="w-2.5 h-2.5" />
                                {calculateAge(profile.date_of_birth)}
                              </Badge>
                            )}
                            {profile.show_zodiac_sign && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] px-2 py-0">
                                {getZodiacSign(profile.date_of_birth).split(' ')[1]}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Messaging Price */}
                        {messagingPrices[profile.id] && (
                          <div className="flex flex-col items-center gap-0.5 text-xs text-green-400 mb-1">
                            <span className="text-green-300 font-medium">${(messagingPrices[profile.id] * 0.10).toFixed(2)}/msg</span>
                            <div className="flex items-center gap-1 text-[10px] text-green-300/80 flex-wrap justify-center">
                              <span>{messagingPrices[profile.id]} {messagingPrices[profile.id] === 1 ? 'credit' : 'credits'}</span>
                              <span>•</span>
                              <SixthPriceTag usdPrice={messagingPrices[profile.id] * 0.10} size="sm" showUsd={false} />
                            </div>
                          </div>
                        )}

                        {/* Follow Button */}
                        {user && user.id !== profile.id && (
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <FollowButton
                              targetUserId={profile.id}
                              targetUserName={profile.display_name || 'User'}
                              followStatus={followStatuses[profile.id] || 'none'}
                              onRequestSent={() => fetchFollowStatuses()}
                              className="w-full text-xs h-7"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilesDirectory;