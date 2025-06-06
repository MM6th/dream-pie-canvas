
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface BackgroundUploadProps {
  onUploadSuccess?: (url: string) => void;
}

const BackgroundUpload = ({ onUploadSuccess }: BackgroundUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, or WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/background-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('backgrounds')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(fileName);

      // Update user profile with new background image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ background_image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Background image uploaded successfully!"
      });

      onUploadSuccess?.(publicUrl);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
      <p className="text-gray-400 mb-2">Drop your background image here</p>
      <p className="text-sm text-gray-500 mb-4">Recommended: 1920x1080 or 2560x1440 pixels</p>
      <Button 
        onClick={handleFileSelect}
        disabled={uploading}
        className="bg-gradient-to-r from-gray-600 to-black hover:from-gray-700 hover:to-gray-900"
      >
        {uploading ? "Uploading..." : "Choose File"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default BackgroundUpload;
