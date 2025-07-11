
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  User,
  MessageSquare,
  Image as ImageIcon,
  Link,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import BulletinPostModal from "../BulletinPostModal";

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  post_type: string | null;
  is_adult_content: boolean | null;
  created_at: string;
  updated_at: string;
  merchant_id: string;
  contract_type?: string | null;
  youtube_contractor_share?: number | null;
  pie_contractor_share?: number | null;
  pie_episode_cost?: number | null;
  number_of_opportunities?: number | null;
  uploaded_image_url?: string | null;
  contract_generated?: boolean | null;
  profiles?: {
    display_name: string | null;
    business_name: string | null;
  };
}

const AdminBulletinPostManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [editingPost, setEditingPost] = useState<BulletinPost | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          profiles (
            display_name,
            business_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching bulletin posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bulletin posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || post.post_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getPostTypeColor = (type: string | null) => {
    switch (type) {
      case 'tv_guide': return 'bg-blue-600';
      case 'current_thoughts': return 'bg-purple-600';
      case 'announcement': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        Loading bulletin posts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Bulletin Post Management</h2>
          <p className="text-gray-400">Manage all bulletin board posts</p>
        </div>
        <BulletinPostModal
          onSuccess={fetchPosts}
          mode="create"
          initialPostType="regular"
        />
      </div>

      {/* Filters and Search */}
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="all">All Types</option>
                <option value="tv_guide">TV Guide</option>
                <option value="current_thoughts">Current Thoughts</option>
                <option value="announcement">Announcements</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal Scrolling Posts */}
      {filteredPosts.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Posts Found</h3>
            <p className="text-gray-400">
              {searchTerm || filterType !== "all" 
                ? "No posts match your search criteria." 
                : "No bulletin posts have been created yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Posts ({filteredPosts.length})
          </h3>
          <ScrollArea className="w-full" thumbClassName="bg-gray-600">
            <div className="flex gap-4 pb-4" style={{ width: `${filteredPosts.length * 320}px` }}>
              {filteredPosts.map((post) => (
                <Card key={post.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm flex-shrink-0 w-80">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header with title and badges */}
                      <div className="space-y-2">
                        <h4 className="text-white font-semibold text-sm line-clamp-2 h-10">{post.title}</h4>
                        <div className="flex flex-wrap gap-1">
                          {post.post_type && (
                            <Badge className={`${getPostTypeColor(post.post_type)} text-white text-xs h-5`}>
                              {post.post_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                          {post.contract_type && (
                            <Badge className="bg-purple-600 text-white text-xs h-5">
                              {post.contract_type.toUpperCase()}
                            </Badge>
                          )}
                          {post.is_adult_content && (
                            <Badge className="bg-orange-600 text-white text-xs flex items-center gap-1 h-5">
                              <Shield className="w-3 h-3" />
                              18+
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Content preview */}
                      <p className="text-gray-300 text-xs line-clamp-3 h-12">{post.content}</p>
                      
                      {/* Image preview */}
                      {(post.uploaded_image_url || post.image_url) && (
                        <div className="w-full h-20 bg-gray-700 rounded overflow-hidden">
                          <img
                            src={post.uploaded_image_url || post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Contract details for announcements */}
                      {post.post_type === 'announcement' && (
                        <div className="bg-gray-700/30 p-2 rounded text-xs space-y-1">
                          <div className="font-semibold text-purple-300">Contract Details:</div>
                          {post.youtube_contractor_share && (
                            <div className="text-gray-400">YouTube: {post.youtube_contractor_share}%</div>
                          )}
                          {post.pie_contractor_share && (
                            <div className="text-gray-400">PIE: {post.pie_contractor_share}%</div>
                          )}
                          {post.pie_episode_cost && (
                            <div className="text-gray-400">Cost: ${post.pie_episode_cost}</div>
                          )}
                          {post.number_of_opportunities && (
                            <div className="text-gray-400">Spots: {post.number_of_opportunities}</div>
                          )}
                          {post.contract_generated && (
                            <div className="text-green-400 text-xs">✓ Contract Generated</div>
                          )}
                        </div>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{post.profiles?.display_name || post.profiles?.business_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(post.image_url || post.uploaded_image_url) && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>Image</span>
                            </div>
                          )}
                          {post.link_url && (
                            <div className="flex items-center gap-1">
                              <Link className="w-3 h-3" />
                              <span>Link</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-1 pt-2">
                        <BulletinPostModal
                          onSuccess={fetchPosts}
                          mode="edit"
                          post={{
                            id: post.id,
                            title: post.title,
                            content: post.content,
                            image_url: post.image_url || undefined,
                            link_url: post.link_url || undefined,
                            is_adult_content: post.is_adult_content || false,
                            post_type: post.post_type || undefined,
                            contract_type: post.contract_type || undefined,
                            youtube_contractor_share: post.youtube_contractor_share || undefined,
                            pie_contractor_share: post.pie_contractor_share || undefined,
                            pie_episode_cost: post.pie_episode_cost || undefined,
                            number_of_opportunities: post.number_of_opportunities || undefined,
                            uploaded_image_url: post.uploaded_image_url || undefined
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(post.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900/20 flex-1"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default AdminBulletinPostManager;
