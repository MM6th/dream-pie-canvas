
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Clock, CheckCircle, XCircle, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SongCoverSubmissionModal from "./SongCoverSubmissionModal";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  thumbnail_url: string | null;
}

interface CoverSubmission {
  id: string;
  audio_product_id: string;
  cover_image_url: string;
  submission_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  audio_product_title?: string;
  audio_product_artist?: string | null;
}

const SongCoverManager = () => {
  const { user } = useAuth();
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [submissions, setSubmissions] = useState<CoverSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AudioProduct | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const fetchAudioProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select('id, title, artist_name, thumbnail_url')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudioProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching audio products:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      // First get submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('song_cover_submissions')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Then get audio product details for each submission
      const enrichedSubmissions = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: audioData } = await supabase
            .from('audio_products')
            .select('title, artist_name')
            .eq('id', submission.audio_product_id)
            .single();

          return {
            ...submission,
            audio_product_title: audioData?.title || 'Unknown Song',
            audio_product_artist: audioData?.artist_name || 'Unknown Artist'
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchAudioProducts(), fetchSubmissions()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user]);

  const handleSubmissionSuccess = () => {
    fetchSubmissions();
    toast({
      title: "Success",
      description: "Cover submitted for admin approval!"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  if (loading) {
    return <div className="text-white">Loading cover submissions...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Song Cover Submissions</h3>
          <p className="text-gray-400 mb-6">Submit custom covers for your songs for admin approval</p>
        </div>

        {/* Audio Products for Cover Submission */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Submit New Cover</h4>
          {audioProducts.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400">No audio products available for cover submission</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {audioProducts.map((product) => (
                <Card key={product.id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {product.thumbnail_url ? (
                        <img
                          src={product.thumbnail_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                          <Image className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white font-medium truncate">{product.title}</h5>
                        <p className="text-gray-400 text-sm truncate">
                          {product.artist_name || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowSubmissionModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Cover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Existing Submissions */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Your Submissions</h4>
          {submissions.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6 text-center">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h5 className="text-lg font-semibold text-white mb-2">No Submissions Yet</h5>
                <p className="text-gray-400">Submit your first song cover for approval!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={submission.cover_image_url}
                        alt="Submitted cover"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="text-white font-medium">
                            {submission.audio_product_title}
                          </h5>
                          <Badge className={`${getStatusColor(submission.status)} text-white`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(submission.status)}
                              {submission.status}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          by {submission.audio_product_artist}
                        </p>
                        <p className="text-gray-400 text-sm mb-2">
                          Submitted {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                        {submission.submission_notes && (
                          <p className="text-gray-300 text-sm mb-2">
                            <strong>Your notes:</strong> {submission.submission_notes}
                          </p>
                        )}
                        {submission.admin_notes && (
                          <p className="text-gray-300 text-sm">
                            <strong>Admin feedback:</strong> {submission.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <SongCoverSubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => {
            setShowSubmissionModal(false);
            setSelectedProduct(null);
          }}
          audioProduct={selectedProduct}
          onSubmissionSuccess={handleSubmissionSuccess}
        />
      )}
    </>
  );
};

export default SongCoverManager;
