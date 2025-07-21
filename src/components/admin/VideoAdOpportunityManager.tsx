import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, Edit, Trash2, Plus, DollarSign, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import VideoAdOpportunityUploadModal from "@/components/VideoAdOpportunityUploadModal";
import EditVideoAdOpportunityModal from "./EditVideoAdOpportunityModal";

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  payment_amount: number;
  target_platform: string;
  audio_type: string;
  available_spots: number;
  access_level: string;
  is_adult_content: boolean;
  created_at: string;
}

const VideoAdOpportunityManager = () => {
  const [opportunities, setOpportunities] = useState<VideoAdOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<VideoAdOpportunity | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('video_ad_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error: any) {
      console.error('Error fetching video ad opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load video ad opportunities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleEdit = (opportunity: VideoAdOpportunity) => {
    setSelectedOpportunity(opportunity);
    setEditModalOpen(true);
  };

  const handleDelete = (opportunity: VideoAdOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedOpportunity) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('video_ad_opportunities')
        .delete()
        .eq('id', selectedOpportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video ad opportunity deleted successfully!"
      });

      setDeleteConfirmOpen(false);
      setSelectedOpportunity(null);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete opportunity",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Badge className="bg-green-600">Public</Badge>;
      case 'merchant_only':
        return <Badge className="bg-orange-600">Merchants Only</Badge>;
      case 'paid':
        return <Badge className="bg-purple-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{accessLevel}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Loading Video Ad Opportunities...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video Ad Opportunities
              <Badge className="bg-blue-600 text-white">
                {opportunities.length} Total
              </Badge>
            </div>
            <Button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No video ad opportunities created yet.</p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Opportunity
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-lg mb-1">
                        {opportunity.title}
                      </h3>
                      {opportunity.description && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {opportunity.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => handleEdit(opportunity)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(opportunity)}
                        variant="outline"
                        size="sm"
                        className="border-red-600 text-red-400 bg-transparent hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Payment</p>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span className="text-white font-medium">{opportunity.payment_amount}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Platform</p>
                      <span className="text-white capitalize">{opportunity.target_platform}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Available Spots</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span className="text-white">{opportunity.available_spots}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Audio Type</p>
                      <span className="text-white capitalize">{opportunity.audio_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAccessLevelBadge(opportunity.access_level)}
                      {opportunity.is_adult_content && (
                        <Badge className="bg-red-600">Adult Content</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={opportunity.audio_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Audio
                      </a>
                      <span className="text-xs text-gray-500">
                        Created {new Date(opportunity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <VideoAdOpportunityUploadModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchOpportunities();
        }}
      />

      {/* Edit Modal */}
      <EditVideoAdOpportunityModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedOpportunity(null);
        }}
        opportunity={selectedOpportunity}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedOpportunity(null);
          fetchOpportunities();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Video Ad Opportunity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete "{selectedOpportunity?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                variant="outline"
                className="border-gray-600 text-white bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoAdOpportunityManager;