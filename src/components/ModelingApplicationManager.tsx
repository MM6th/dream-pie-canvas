
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ModelingApplication {
  id: string;
  application_photos: string[];
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  fashion_products: {
    title: string;
    price: number;
  };
}

const ModelingApplicationManager = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ModelingApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('modeling_applications')
        .select(`
          id,
          application_photos,
          status,
          admin_notes,
          created_at,
          reviewed_at,
          fashion_products (
            title,
            price
          )
        `)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching modeling applications:', error);
      toast({
        title: "Error",
        description: "Failed to load modeling applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
    return (
      <div className="text-white">Loading your modeling applications...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Your Modeling Applications</h3>
        <p className="text-gray-400 mb-6">Track your modeling opportunity applications</p>
      </div>

      {applications.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No Applications Yet</h4>
            <p className="text-gray-400">Apply for modeling opportunities on merchant-only fashion products!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((application) => (
            <Card key={application.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-lg line-clamp-2">
                      {application.fashion_products.title}
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">
                      Product Price: ${application.fashion_products.price.toFixed(2)}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(application.status)} flex items-center gap-1`}>
                    {getStatusIcon(application.status)}
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">
                      Applied: {new Date(application.created_at).toLocaleDateString()}
                    </p>
                    {application.reviewed_at && (
                      <p className="text-sm text-gray-400">
                        Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {application.admin_notes && (
                    <div className="bg-gray-700/50 p-3 rounded">
                      <p className="text-sm font-medium text-white">Admin Feedback:</p>
                      <p className="text-sm text-gray-300">{application.admin_notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-white mb-2">
                      Photos ({application.application_photos.length})
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {application.application_photos.slice(0, 4).map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Application photo ${index + 1}`}
                          className="w-full h-16 object-cover rounded"
                        />
                      ))}
                      {application.application_photos.length > 4 && (
                        <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">
                            +{application.application_photos.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelingApplicationManager;
