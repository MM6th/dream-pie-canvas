import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, MapPin, Globe, Shield, Building, MessageSquare, ExternalLink, FolderOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import PostInteractions from "@/components/PostInteractions";
import PublicPlaylist from "@/components/profile/PublicPlaylist";
import PortfolioCard from "@/components/profile/PortfolioCard";
import { PrivateProfileOverlay } from "@/components/profile/PrivateProfileOverlay";
import { usePrivacyCheck } from "@/hooks/usePrivacyCheck";
import { useFollowRequest } from "@/hooks/useFollowRequest";
import { useAuth } from "@/hooks/useAuth";
import type { FollowStatus } from "@/hooks/useFollowRequest";
import { MessageButton } from "@/components/profile/MessageButton";

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
  display_order: number;
  is_blurred: boolean;
}

interface Portfolio {
  id: string;
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
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [followStatusLoading, setFollowStatusLoading] = useState(true);
  
  const { isPrivate, canView, loading: privacyLoading, refetch: refetchPrivacy } = usePrivacyCheck(userId || '');
  const { checkFollowStatus } = useFollowRequest();

  useEffect(() => {
    if (userId && !authLoading) {
      fetchProfileData();
      fetchUserPosts();
      fetchPortfolios();
      updateFollowStatus();
    }
  }, [userId, user?.id, authLoading]); // Re-check when user changes or auth completes

  const updateFollowStatus = async () => {
    if (!userId || authLoading) return;
    setFollowStatusLoading(true);
    const status = await checkFollowStatus(userId);
    setFollowStatus(status);
    setFollowStatusLoading(false);
  };

  const handleRequestSent = () => {
    setFollowStatus('pending');
    refetchPrivacy();
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
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      setUserPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
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
            display_order,
            is_blurred
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

  if (loading || privacyLoading || followStatusLoading || authLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
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

      <div className="container mx-auto px-4 py-8">
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
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      {profile.user_type === 'merchant' ? 'Merchant' : 'Supporter'}
                    </Badge>
                    {profile.is_admin && (
                      <Badge variant="secondary" className="bg-orange-600 text-white flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </Badge>
                    )}
                    {profile.is_adult_creator && (
                      <Badge variant="secondary" className="bg-purple-600 text-white">
                        Adult Creator
                      </Badge>
                    )}
                  </div>

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
                </div>
              </CardContent>
            </Card>

            {/* Show private overlay or full content */}
            {isPrivate && !canView && user?.id !== userId ? (
              null /* Private content hidden */
            ) : (
              <>
                {/* Business Info (for merchants) */}
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
                      {profile.website && (
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

                {/* Social Media Links */}
                {socialLinks.length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Social Media</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                )}

                {/* Public Playlist */}
                {userId && <PublicPlaylist userId={userId} />}

                {/* Stats */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-gray-300">
                      <MessageSquare className="w-4 h-4" />
                      <span>{userPosts.length} Posts</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Posts & Portfolio Column */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-2'} space-y-6`}>
            {/* Show private overlay or content */}
            {isPrivate && !canView && user?.id !== userId ? (
              <PrivateProfileOverlay
                merchantId={userId || ''}
                merchantName={profile?.display_name || 'this user'}
                followStatus={followStatus}
                onRequestSent={handleRequestSent}
              />
            ) : (
              <>
                {/* Most Recent Post */}
                {userPosts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-6">
                      <MessageSquare className="w-6 h-6 text-white" />
                      <h2 className="text-2xl font-bold text-white">Most Recent Post</h2>
                    </div>

                    <div className="space-y-6">
                      {userPosts.map((post) => (
                  <Card key={post.id} className="bg-gray-800 border-gray-700">
                    {((post.image_url || post.uploaded_image_url) && post.media_type !== 'video') && (
                      <CardHeader className="p-0">
                        <img
                          src={post.uploaded_image_url || post.image_url}
                          alt={post.title}
                          className="w-full h-64 object-cover rounded-t-lg"
                        />
                      </CardHeader>
                    )}
                    {post.video_url && post.media_type === 'video' && (
                      <CardHeader className="p-0">
                        <video
                          src={post.video_url}
                          controls
                          className="w-full h-64 object-cover rounded-t-lg"
                          preload="metadata"
                        />
                      </CardHeader>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-white text-xl">{post.title}</CardTitle>
                        {post.post_type && (
                          <Badge variant="secondary" className="text-xs">
                            {post.post_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">{post.content}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
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
              </>
            )}

            {/* Portfolio Section */}
            {portfolios.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-6">
                  <FolderOpen className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Portfolio</h2>
                </div>
                {portfolios.map((portfolio) => (
                  <PortfolioCard key={portfolio.id} portfolio={portfolio} />
                ))}
              </div>
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