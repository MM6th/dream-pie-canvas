
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
}

const AvatarUpload = ({ avatarUrl, onAvatarChange }: AvatarUploadProps) => {
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

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="w-24 h-24">
        <AvatarImage src={avatarUrl} alt="Avatar" />
        <AvatarFallback className="bg-gray-600">
          <User className="w-12 h-12 text-gray-400" />
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
          disabled={uploading}
          className="border-gray-600 text-white hover:bg-white hover:text-black"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Avatar"}
        </Button>
      </div>
    </div>
  );
};

export default AvatarUpload;
