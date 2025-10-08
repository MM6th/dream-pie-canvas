
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ContentPicker from "@/components/ContentPicker";
import { Image } from "lucide-react";

interface BackgroundUploadProps {
  onUploadSuccess?: (url: string) => void;
}

const BackgroundUpload = ({ onUploadSuccess }: BackgroundUploadProps) => {
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  const handleContentSelect = async (url: string, type: 'image' | 'video') => {
    if (!user) return;

    if (type !== 'image') {
      toast({
        title: "Invalid selection",
        description: "Please select an image for your background",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);

    try {
      // Update user profile with new background image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ background_image_url: url })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Background image updated successfully!"
      });

      onUploadSuccess?.(url);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
      <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-gray-400 mb-2">Select a background image from your content gallery</p>
      <p className="text-sm text-gray-500 mb-4">Recommended: 1000x864 pixels</p>
      <ContentPicker 
        onContentSelect={handleContentSelect}
      />
      {updating && <p className="text-sm text-gray-400 mt-2">Updating background...</p>}
    </div>
  );
};

export default BackgroundUpload;
