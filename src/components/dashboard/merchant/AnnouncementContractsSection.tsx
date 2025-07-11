import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  Play,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AnnouncementPost {
  id: string;
  title: string;
  content: string;
  contract_type: string;
  youtube_contractor_share?: number;
  pie_contractor_share?: number;
  pie_episode_cost?: number;
  number_of_opportunities?: number;
  created_at: string;
  uploaded_image_url?: string;
  image_url?: string;
}

const AnnouncementContractsSection = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('post_type', 'announcement')
        .not('contract_type', 'is', null)
        .neq('contract_type', 'regular')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contract opportunities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadContract = async (announcementId: string, title: string) => {
    try {
      // Find the associated contract for this announcement
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('merchant_id', `announcement_${announcementId}`)
        .eq('status', 'available')
        .maybeSingle();

      if (error) throw error;

      if (!contracts) {
        toast({
          title: "Contract not found",
          description: "No contract available for this opportunity",
          variant: "destructive"
        });
        return;
      }

      // Create a contract application entry
      const { error: insertError } = await supabase
        .from('contracts')
        .insert([{
          merchant_id: user?.id,
          contract_type: contracts.contract_type,
          contract_terms: contracts.contract_terms,
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Contract Downloaded",
        description: `Contract for "${title}" is now available in your dashboard for review and signing.`,
      });

      // Refresh the page or navigate to contracts section
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: "Error",
        description: "Failed to download contract. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case 'audio': return 'bg-blue-600';
      case 'asmr': return 'bg-purple-600';
      case 'modeling': return 'bg-pink-600';
      case 'podcast': return 'bg-green-600';
      case 'film': return 'bg-red-600';
      case 'video': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="text-white">Loading contract opportunities...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Available Contract Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Opportunities Available</h3>
            <p className="text-gray-400">
              Check back regularly for new contract opportunities. You'll be notified when new announcements are posted.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
                      <Badge className={`${getContractTypeColor(announcement.contract_type)} text-white text-xs`}>
                        {announcement.contract_type.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-4 line-clamp-3">{announcement.content}</p>
                    
                    {/* Contract Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {announcement.youtube_contractor_share && (
                        <div className="bg-red-900/20 p-3 rounded border border-red-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Play className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-medium text-red-400">YouTube Share</span>
                          </div>
                          <p className="text-lg font-bold text-red-300">{announcement.youtube_contractor_share}%</p>
                        </div>
                      )}
                      
                      {announcement.pie_contractor_share && (
                        <div className="bg-purple-900/20 p-3 rounded border border-purple-600">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-medium text-purple-400">PIE Share</span>
                          </div>
                          <p className="text-lg font-bold text-purple-300">{announcement.pie_contractor_share}%</p>
                        </div>
                      )}
                      
                      {announcement.pie_episode_cost && (
                        <div className="bg-green-900/20 p-3 rounded border border-green-600">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-xs font-medium text-green-400">Episode Cost</span>
                          </div>
                          <p className="text-lg font-bold text-green-300">${announcement.pie_episode_cost}</p>
                        </div>
                      )}
                      
                      {announcement.number_of_opportunities && (
                        <div className="bg-blue-900/20 p-3 rounded border border-blue-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-medium text-blue-400">Positions</span>
                          </div>
                          <p className="text-lg font-bold text-blue-300">{announcement.number_of_opportunities}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Posted {formatDate(announcement.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {(announcement.uploaded_image_url || announcement.image_url) && (
                    <div className="ml-4">
                      <img
                        src={announcement.uploaded_image_url || announcement.image_url}
                        alt={announcement.title}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-600"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleDownloadContract(announcement.id, announcement.title)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Contract
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementContractsSection;