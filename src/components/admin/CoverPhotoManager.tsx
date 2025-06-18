import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ImagePicker from "../ImagePicker";

interface CoverPhoto {
  id: string;
  page_name: string;
  cover_image_url: string;
  created_at: string;
}

interface CoverPhotoManagerProps {
  onSuccess?: () => void;
}

const CoverPhotoManager = ({ onSuccess }: CoverPhotoManagerProps) => {
  const { user } = useAuth();
  const [bulletinCover, setBulletinCover] = useState('');
  const [filmsCover, setFilmsCover] = useState('');
  const [storeCover, setStoreCover] = useState('');
  const [existingCovers, setExistingCovers] = useState<CoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExistingCovers();
  }, []);

  const fetchExistingCovers = async () => {
    try {
      const { data, error } = await supabase
        .from('cover_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cover photos:', error);
      } else {
        setExistingCovers(data || []);
        
        // Set current values for each page
        const bulletin = data?.find(cover => cover.page_name === 'bulletin');
        const films = data?.find(cover => cover.page_name === 'films');
        const store = data?.find(cover => cover.page_name === 'store');
        
        if (bulletin) setBulletinCover(bulletin.cover_image_url);
        if (films) setFilmsCover(films.cover_image_url);
        if (store) setStoreCover(store.cover_image_url);
      }
    } catch (error) {
      console.error('Error fetching cover photos:', error);
    }
  };

  const handleSaveCovers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const coverUpdates = [
        { page_name: 'bulletin', url: bulletinCover },
        { page_name: 'films', url: filmsCover },
        { page_name: 'store', url: storeCover }
      ];

      for (const cover of coverUpdates) {
        if (cover.url) {
          // Check if cover exists for this page
          const existing = existingCovers.find(c => c.page_name === cover.page_name);
          
          if (existing) {
            // Update existing
            const { error } = await supabase
              .from('cover_photos')
              .update({
                cover_image_url: cover.url,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
              
            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from('cover_photos')
              .insert({
                page_name: cover.page_name,
                cover_image_url: cover.url,
                admin_id: user.id
              });
              
            if (error) throw error;
          }
        }
      }

      toast({
        title: "Success",
        description: "Cover photos updated successfully!"
      });
      
      fetchExistingCovers();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving covers:', error);
      toast({
        title: "Error",
        description: "Failed to update cover photos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCover = async (coverId: string, pageName: string) => {
    try {
      const { error } = await supabase
        .from('cover_photos')
        .delete()
        .eq('id', coverId);

      if (error) throw error;

      // Clear the local state for this page
      if (pageName === 'bulletin') setBulletinCover('');
      if (pageName === 'films') setFilmsCover('');
      if (pageName === 'store') setStoreCover('');

      toast({
        title: "Success",
        description: "Cover photo deleted successfully!"
      });

      fetchExistingCovers();
    } catch (error) {
      console.error('Error deleting cover:', error);
      toast({
        title: "Error",
        description: "Failed to delete cover photo",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ImageIcon className="w-5 h-5" />
          Cover Photo Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-white mb-2 block">Bulletin Board Cover Photo</Label>
          <ImagePicker
            onImageSelect={setBulletinCover}
            currentImageUrl={bulletinCover}
          />
          {bulletinCover && (
            <div className="mt-2 flex items-center gap-2">
              <img src={bulletinCover} alt="Bulletin Cover Preview" className="w-20 h-12 object-cover rounded" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const existing = existingCovers.find(c => c.page_name === 'bulletin');
                  if (existing) handleDeleteCover(existing.id, 'bulletin');
                }}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <div>
          <Label className="text-white mb-2 block">Films Page Cover Photo</Label>
          <ImagePicker
            onImageSelect={setFilmsCover}
            currentImageUrl={filmsCover}
          />
          {filmsCover && (
            <div className="mt-2 flex items-center gap-2">
              <img src={filmsCover} alt="Films Cover Preview" className="w-20 h-12 object-cover rounded" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const existing = existingCovers.find(c => c.page_name === 'films');
                  if (existing) handleDeleteCover(existing.id, 'films');
                }}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <div>
          <Label className="text-white mb-2 block">Store Page Cover Photo</Label>
          <ImagePicker
            onImageSelect={setStoreCover}
            currentImageUrl={storeCover}
          />
          {storeCover && (
            <div className="mt-2 flex items-center gap-2">
              <img src={storeCover} alt="Store Cover Preview" className="w-20 h-12 object-cover rounded" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const existing = existingCovers.find(c => c.page_name === 'store');
                  if (existing) handleDeleteCover(existing.id, 'store');
                }}
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-1">Recommended: 1000x864 pixels</p>
        </div>

        <Button
          onClick={handleSaveCovers}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Save Cover Photos
            </>
          )}
        </Button>

        {/* Existing Covers Display */}
        {existingCovers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-white font-medium mb-3">Current Cover Photos</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {existingCovers.map((cover) => (
                <div key={cover.id} className="bg-gray-700/50 p-3 rounded-lg">
                  <img src={cover.cover_image_url} alt={`${cover.page_name} cover`} className="w-full h-32 object-cover rounded mb-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm capitalize">{cover.page_name} Page</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCover(cover.id, cover.page_name)}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoverPhotoManager;
