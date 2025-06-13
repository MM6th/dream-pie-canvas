
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import PhotoUpload from "./PhotoUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

const PhotoGallery = () => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchUploads();
      fetchStorageUsage();
    }
  }, [user]);

  const fetchUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploads:', error);
        return;
      }

      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching storage usage:', error);
        return;
      }

      setStorageUsage(data || 0);
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    }
  };

  const handleDelete = async (upload: UserUpload) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-media')
        .remove([upload.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_uploads')
        .delete()
        .eq('id', upload.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Photo deleted successfully!"
      });

      fetchUploads();
      fetchStorageUsage();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive"
      });
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = (storageUsage / (2 * 1024 * 1024 * 1024)) * 100;

  if (loading) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Loading your photos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Photo Gallery</h3>
          <p className="text-gray-400">Manage your uploaded photos</p>
        </div>
        <PhotoUpload onSuccess={() => { fetchUploads(); fetchStorageUsage(); }} />
      </div>

      {/* Storage Usage */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-medium">Storage Usage</span>
            <span className="text-gray-300">
              {formatBytes(storageUsage)} / 2GB ({Math.round(storagePercentage)}%)
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                storagePercentage > 90 ? 'bg-red-500' : 
                storagePercentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {uploads.length === 0 ? (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">No photos uploaded yet. Upload your first photo!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((upload) => (
            <Card key={upload.id} className="bg-gray-700/50 border-gray-600 overflow-hidden">
              <div className="aspect-video relative">
                {upload.file_type.startsWith('image/') ? (
                  <img
                    src={getImageUrl(upload.file_path)}
                    alt={upload.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    {upload.file_type.split('/')[1].toUpperCase()}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h4 className="text-white font-medium truncate mb-2">{upload.file_name}</h4>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span>{formatBytes(upload.file_size)}</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(upload.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-600 text-white hover:bg-gray-600"
                    onClick={() => window.open(getImageUrl(upload.file_path), '_blank')}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-800 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Photo</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete "{upload.file_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(upload)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
