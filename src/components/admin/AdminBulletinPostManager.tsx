import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      <div className="grid gap-4">
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
          filteredPosts.map((post) => (
            <Card key={post.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                      {post.post_type && (
                        <Badge className={`${getPostTypeColor(post.post_type)} text-white text-xs`}>
                          {post.post_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                      {post.is_adult_content && (
                        <Badge className="bg-orange-600 text-white text-xs flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          18+
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{post.content}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{post.profiles?.display_name || post.profiles?.business_name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                      {post.image_url && (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" />
                          <span>Has Image</span>
                        </div>
                      )}
                      {post.link_url && (
                        <div className="flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          <span>Has Link</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <BulletinPostModal
                      onSuccess={fetchPosts}
                      mode="edit"
                      post={{
                        id: post.id,
                        title: post.title,
                        content: post.content,
                        image_url: post.image_url || undefined,
                        link_url: post.link_url || undefined,
                        is_adult_content: post.is_adult_content || false
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(post.id)}
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {post.image_url && (
                  <div className="mt-4">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
};

export default AdminBulletinPostManager;