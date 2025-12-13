
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  avatarUrl?: string;
  onAvatarChange: (url: string) => void;
  compact?: boolean;
}

const AvatarUpload = ({ avatarUrl, onAvatarChange, compact = false }: AvatarUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Error uploading avatar:', error);
        toast({
          title: "Error",
          description: "Failed to upload avatar. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onAvatarChange(publicUrl);
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully!"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const avatarSize = compact ? "w-16 h-16" : "w-24 h-24";
  const iconSize = compact ? "w-8 h-8" : "w-12 h-12";

  return (
    <div className={`flex flex-col items-center ${compact ? 'space-y-2' : 'space-y-4'}`}>
      <Avatar className={avatarSize}>
        <AvatarImage src={avatarUrl} alt="Avatar" />
        <AvatarFallback className="bg-gray-600">
          <User className={`${iconSize} text-gray-400`} />
        </AvatarFallback>
      </Avatar>
      
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="avatar-upload"
        />
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={uploading}
          className="border-gray-600 text-black bg-white hover:bg-gray-100"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Avatar"}
        </Button>
      </div>
    </div>
  );
};

export default AvatarUpload;
