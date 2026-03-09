import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { ArrowLeft, User, Calendar, MapPin, Globe, Shield, Building, MessageSquare, ExternalLink, FolderOpen, Lock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import PostInteractions from "@/components/PostInteractions";
import PublicPlaylist from "@/components/profile/PublicPlaylist";
import PortfolioCard from "@/components/profile/PortfolioCard";
import ProfilePodcastSection from "@/components/profile/ProfilePodcastSection";
import { PrivateProfileOverlay } from "@/components/profile/PrivateProfileOverlay";
import { useVisibilityCheck } from "@/hooks/useVisibilityCheck";
import { useFollowRequest } from "@/hooks/useFollowRequest";
import { useAuth } from "@/hooks/useAuth";
import type { FollowStatus } from "@/hooks/useFollowRequest";
import { MessageButton } from "@/components/profile/MessageButton";
import { FollowButton } from "@/components/profile/FollowButton";
import SixthPriceTag from "@/components/SixthPriceTag";

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  background_image_url?: string;
  user_type: string;
  is_admin?: boolean;
  is_adult_creator?: boolean;
  business_name?: string;
  business_description?: string;
  website?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  snapchat_url?: string;
  pinterest_url?: string;
  onlyfans_url?: string;
  created_at: string;
  skills?: string[];
}

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  uploaded_image_url?: string;
  video_url?: string;
  media_type?: string;
  post_type?: string;
  created_at: string;
  link_url?: string;
}

interface PortfolioImage {
  id: string;
  image_path: string;
  video_url: string | null;
  media_type: string;
  display_order: number;
  is_blurred: boolean;
  background_music_url?: string | null;
}

interface Portfolio {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_for_sale: boolean;
  price?: number;
  created_at: string;
  portfolio_images: PortfolioImage[];
}

const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<BulletinPost[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [followStatusLoading, setFollowStatusLoading] = useState(true);
  const [messagingPrice, setMessagingPrice] = useState<number | null>(null);
  
  const { 
    socialLinksVisible, 
    portfoliosVisible, 
    playlistVisible, 
    postsVisible,
    isFollower,
    loading: visibilityLoading,
    refetch: refetchVisibility 
  } = useVisibilityCheck(userId || '');
  const { checkFollowStatus } = useFollowRequest();

  // Fetch posts immediately without waiting for auth
  useEffect(() => {
    if (userId) {
      fetchUserPosts();
      fetchPortfolios();
    }
  }, [userId]);

  // Fetch auth-dependent data after auth resolves
  useEffect(() => {
    if (userId && !authLoading) {
      fetchProfileData();
      updateFollowStatus();
      fetchMessagingPrice();
    }
  }, [userId, user?.id, authLoading]);

  const updateFollowStatus = async () => {
    if (!userId || authLoading) return;
    setFollowStatusLoading(true);
    const status = await checkFollowStatus(userId);
    setFollowStatus(status);
    setFollowStatusLoading(false);
  };

  const fetchMessagingPrice = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('message_settings')
        .select('credits_per_message, enabled')
        .eq('merchant_id', userId)
        .single();
      if (data?.enabled) {
        setMessagingPrice(data.credits_per_message);
      }
    } catch (error) {
      // No settings found, that's ok
    }
  };

  const handleRequestSent = () => {
    setFollowStatus('pending');
    refetchVisibility();
  };

  const fetchProfileData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('merchant_id', userId)
        .neq('post_type', 'announcement')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      setUserPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoaded(true);
    }
  };

  const fetchPortfolios = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          portfolio_images (
            id,
            image_path,
            video_url,
            media_type,
            display_order,
            is_blurred,
            background_music_url,
            is_video_muted
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching portfolios:', error);
        return;
      }

      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const handleSocialClick = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLinkClick = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  const isOwnProfile = user?.id === userId;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const socialLinks = [
    { url: profile.facebook_url, icon: "Facebook", color: "bg-blue-600" },
    { url: profile.instagram_url, icon: "Instagram", color: "bg-pink-600" },
    { url: profile.youtube_url, icon: "YouTube", color: "bg-red-600" },
    { url: profile.snapchat_url, icon: "Snapchat", color: "bg-yellow-500" },
    { url: profile.pinterest_url, icon: "Pinterest", color: "bg-red-500" },
    { url: profile.onlyfans_url, icon: "OnlyFans", color: "bg-blue-400" },
  ].filter(link => link.url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8">
        <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Profile Info Column */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-1'} space-y-6`}>
            {/* Main Profile Card */}
            <Card className="bg-gray-800 border-gray-700">
              {profile.background_image_url && (
                <div className="h-32 bg-cover bg-center rounded-t-lg" 
                     style={{ backgroundImage: `url(${profile.background_image_url})` }} />
              )}
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-600 -mt-12 mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center -mt-12 mb-4">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {profile.display_name || 'Community Member'}
                  </h1>
                  
                  {/* Hidden admin badge ID */}
                  {(() => {
                    const HIDDEN_ADMIN_BADGE_IDS = ['cedd3262-be80-4af4-9675-c081107cecb5'];
                    return (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                          {profile.user_type === 'merchant' ? 'Merchant' : 'Supporter'}
                        </Badge>
                        {profile.is_admin && !HIDDEN_ADMIN_BADGE_IDS.includes(profile.id) && (
                          <Badge variant="secondary" className="bg-orange-600 text-white flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                  {profile.is_adult_creator && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      Adult Creator
                    </Badge>
                  )}

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </div>

                  {/* Follow Button - show for non-own profiles */}
                  {!isOwnProfile && user && (
                    <FollowButton
                      targetUserId={userId || ''}
                      targetUserName={profile.display_name || 'this user'}
                      followStatus={followStatus}
                      onRequestSent={handleRequestSent}
                      className="w-full mt-2 mb-4"
                    />
                  )}

                  {/* Messaging Price */}
                   {messagingPrice !== null && (
                    <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2 w-full justify-center flex-wrap">
                      <DollarSign className="w-4 h-4" />
                      <span>{messagingPrice} credits per message</span>
                      <SixthPriceTag usdPrice={messagingPrice * 0.10} size="sm" showUsd={false} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Info (for merchants) - visible based on social_links setting */}
            {profile.user_type === 'merchant' && (profile.business_name || profile.business_description) && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.business_name && (
                    <div>
                      <h3 className="text-lg font-semibold text-white">{profile.business_name}</h3>
                    </div>
                  )}
                  {profile.business_description && (
                    <p className="text-gray-300 text-sm">{profile.business_description}</p>
                  )}
                  {socialLinksVisible && profile.website && (
                    <Button
                      onClick={() => handleSocialClick(profile.website!)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Social Media Links - conditional visibility */}
            {socialLinks.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Social Media
                    {!socialLinksVisible && !isOwnProfile && (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {socialLinksVisible || isOwnProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      {socialLinks.map((link, index) => (
                        <Button
                          key={index}
                          onClick={() => handleSocialClick(link.url!)}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        >
                          {link.icon}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Social links are only visible to followers
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Public Playlist - conditional visibility */}
            {userId && (playlistVisible || isOwnProfile) && (
              <PublicPlaylist userId={userId} />
            )}
            {userId && !playlistVisible && !isOwnProfile && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Playlist
                    <Lock className="w-4 h-4 text-gray-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 text-center py-4">
                    Playlist is only visible to followers
                  </p>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Posts & Portfolio Column */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-2'} space-y-6`}>
            {/* Posts - always follower-only */}
            {!postsVisible && !isOwnProfile ? (
              <PrivateProfileOverlay
                merchantId={userId || ''}
                merchantName={profile?.display_name || 'this user'}
                followStatus={followStatus}
                onRequestSent={handleRequestSent}
              />
            ) : (
              <>
                {/* All Posts - shown standalone only when no portfolio exists */}
                {userPosts.length > 0 && !(portfolios.length > 0 && (portfoliosVisible || isOwnProfile)) && (
                  <Card className="bg-gray-800 border-gray-700 h-[600px] flex flex-col">
                    <CardContent className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      <div className="space-y-4">
                        {userPosts.map((post) => (
                          <Card key={post.id} className="bg-gray-700/50 border-gray-600">
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
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                                {post.post_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {post.post_type.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm mb-3 leading-relaxed">{post.content}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(post.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              {post.link_url && (
                                <Button
                                  onClick={() => handleLinkClick(post.link_url!)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Link
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio & Posts Side by Side on Desktop */}
                {portfolios.length > 0 && (portfoliosVisible || isOwnProfile) && (
                  <div className={`grid gap-6 ${!isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="overflow-hidden">
                      {portfolios.map((portfolio) => (
                        <PortfolioCard key={portfolio.id} portfolio={portfolio} />
                      ))}
                    </div>

                    {/* All Posts - beside portfolio on desktop */}
                    {userPosts.length > 0 && postsVisible && (
                      <Card className="bg-gray-800 border-gray-700 h-[600px] flex flex-col">
                        <CardContent className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                          <div className="space-y-4">
                            {userPosts.map((post) => (
                              <Card key={post.id} className="bg-gray-700/50 border-gray-600">
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
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <CardTitle className="text-white text-lg">{post.title}</CardTitle>
                                    {post.post_type && (
                                      <Badge variant="secondary" className="text-xs">
                                        {post.post_type.replace('_', ' ').toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-300 text-sm mb-3 leading-relaxed">{post.content}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(post.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  {post.link_url && (
                                    <Button
                                      onClick={() => handleLinkClick(post.link_url!)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      View Link
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}


                {/* Portfolio locked message */}
                {portfolios.length > 0 && !portfoliosVisible && !isOwnProfile && (
                  <Card className="bg-gray-800 border-gray-700 mt-8">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" />
                        Portfolio
                        <Lock className="w-4 h-4 text-gray-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 text-center py-4">
                        Portfolio is only visible to followers
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Message Button */}
                {profile && user && user.id !== userId && (
                  <div className="mt-6">
                    <MessageButton
                      recipientId={profile.id}
                      recipientName={profile.display_name}
                      recipientType={profile.user_type}
                    />
                  </div>
                )}

                {/* Empty State */}
                {userPosts.length === 0 && portfolios.length === 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No posts or portfolios yet</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
