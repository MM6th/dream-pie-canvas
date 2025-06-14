
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Facebook, Instagram, Youtube, Camera, Pin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { toast } from "@/components/ui/use-toast";
import AvatarUpload from "./AvatarUpload";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileFormSchemaBase = z.object({
  display_name: z.string().min(1, "Display name is required"),
  facebook_url: z.string().url().optional().or(z.literal("")),
  instagram_url: z.string().url().optional().or(z.literal("")),
  youtube_url: z.string().url().optional().or(z.literal("")),
  snapchat_url: z.string().url().optional().or(z.literal("")),
  pinterest_url: z.string().url().optional().or(z.literal("")),
  onlyfans_url: z.string().url().optional().or(z.literal("")),
  contact_email: z.string().email("Please enter a valid email address.").optional().or(z.literal("")),
  paypal_email: z.string().email("Please enter a valid email address.").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileFormSchemaBase>;

interface MerchantProfileModalProps {
  children: React.ReactNode;
  onProfileUpdate?: () => void;
}

const MerchantProfileModal = ({ children, onProfileUpdate }: MerchantProfileModalProps) => {
  const { user } = useAuth();
  const { isApproved } = useApprovalStatus();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const profileSchema = profileFormSchemaBase.superRefine((data, ctx) => {
    if (!isApproved) {
      if (!data.contact_email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Primary Contact Email is required.",
          path: ['contact_email'],
        });
      }
    } else {
      if (!data.paypal_email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PayPal Email is required.',
          path: ['paypal_email'],
        });
      }
    }
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: "",
      facebook_url: "",
      instagram_url: "",
      youtube_url: "",
      snapchat_url: "",
      pinterest_url: "",
      onlyfans_url: "",
      contact_email: "",
      paypal_email: ""
    }
  });

  useEffect(() => {
    if (open && user) {
      fetchProfile();
    }
  }, [open, user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        form.reset({
          display_name: data.display_name || "",
          facebook_url: data.facebook_url || "",
          instagram_url: data.instagram_url || "",
          youtube_url: data.youtube_url || "",
          snapchat_url: data.snapchat_url || "",
          pinterest_url: data.pinterest_url || "",
          onlyfans_url: data.onlyfans_url || "",
          contact_email: data.contact_email || "",
          paypal_email: data.paypal_email || ""
        });
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const updateData: Partial<ProfileFormData> & { avatar_url: string; updated_at: string } = {
          display_name: data.display_name,
          avatar_url: avatarUrl,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          youtube_url: data.youtube_url || null,
          snapchat_url: data.snapchat_url || null,
          pinterest_url: data.pinterest_url || null,
          onlyfans_url: data.onlyfans_url || null,
          updated_at: new Date().toISOString()
      };
      
      if (isApproved) {
        updateData.paypal_email = data.paypal_email || null;
      } else {
        updateData.contact_email = data.contact_email || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      setOpen(false);
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Merchant Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center">
              <AvatarUpload avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} />
            </div>

            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Display Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Your display name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-white font-semibold">Social Media Links</h3>
              
              <FormField
                control={form.control}
                name="facebook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://facebook.com/yourprofile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagram_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="youtube_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://youtube.com/yourchannel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="snapchat_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Snapchat
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://snapchat.com/add/yourusername"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pinterest_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Pin className="w-4 h-4" />
                      Pinterest
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://pinterest.com/yourprofile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onlyfans_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">OnlyFans</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="https://onlyfans.com/yourprofile"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isApproved && (
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Primary Contact Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="your.email@address.com"
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400">
                      We'll use this email for updates on your application status.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {isApproved && (
               <FormField
                control={form.control}
                name="paypal_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">PayPal Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="your.paypal@email.com"
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400">
                      This email will be used for receiving payments.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-gray-600 text-white hover:bg-white hover:text-black"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantProfileModal;
