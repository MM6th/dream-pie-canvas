
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Shield, Upload, Image as ImageIcon, CalendarIcon, Search, Crown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import SixthPriceTag from "./SixthPriceTag";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

interface BulletinPostModalProps {
  onSuccess: () => void;
  post?: {
    id: string;
    title: string;
    content: string;
    image_url?: string;
    link_url?: string;
    is_adult_content?: boolean;
    post_type?: string;
    contract_type?: string;
    youtube_contractor_share?: number;
    pie_contractor_share?: number;
    pie_episode_cost?: number;
    number_of_opportunities?: number;
    uploaded_image_url?: string;
    scheduled_at?: string;
    timezone?: string;
    challenge_type?: string;
    title_on_the_line?: boolean;
    challenger1_purse?: number;
    challenger2_purse?: number;
    champion_purse?: number;
    champion_user_id?: string;
    challenge_time_limit_minutes?: number;
  };
  mode?: 'create' | 'edit';
  initialPostType?: string;
}

interface MerchantProfile {
  id: string;
  display_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
}

const BulletinPostModal = ({ onSuccess, post, mode = 'create', initialPostType }: BulletinPostModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Basic fields
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [imageUrl, setImageUrl] = useState(post?.image_url || '');
  const [linkUrl, setLinkUrl] = useState(post?.link_url || '');
  const [isAdultContent, setIsAdultContent] = useState(post?.is_adult_content || false);
  
  // New fields
  const [postType, setPostType] = useState(post?.post_type || initialPostType || 'regular');
  const [contractType, setContractType] = useState(post?.contract_type || '');
  const [youtubeContractorShare, setYoutubeContractorShare] = useState(post?.youtube_contractor_share?.toString() || '');
  const [pieContractorShare, setPieContractorShare] = useState(post?.pie_contractor_share?.toString() || '');
  const [pieEpisodeCost, setPieEpisodeCost] = useState(post?.pie_episode_cost?.toString() || '');
  const [numberOfOpportunities, setNumberOfOpportunities] = useState(post?.number_of_opportunities?.toString() || '');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(post?.uploaded_image_url || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.uploaded_image_url || null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(post?.scheduled_at ? new Date(post.scheduled_at) : undefined);
  const [scheduledTime, setScheduledTime] = useState(post?.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '');
  const [selectedTimezone, setSelectedTimezone] = useState(post?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [challengeType, setChallengeType] = useState(post?.challenge_type || '');
  const [titleOnTheLine, setTitleOnTheLine] = useState(post?.title_on_the_line || false);
  const [challenger1Purse, setChallenger1Purse] = useState(post?.challenger1_purse?.toString() || '');
  const [challenger2Purse, setChallenger2Purse] = useState(post?.challenger2_purse?.toString() || '');
  const [championPurse, setChampionPurse] = useState(post?.champion_purse?.toString() || '');
  const [championUserId, setChampionUserId] = useState(post?.champion_user_id || '');
  const [championSearch, setChampionSearch] = useState('');
  const [merchantList, setMerchantList] = useState<MerchantProfile[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [selectedChampion, setSelectedChampion] = useState<MerchantProfile | null>(null);
  const [timeLimitHours, setTimeLimitHours] = useState(post?.challenge_time_limit_minutes ? Math.floor(post.challenge_time_limit_minutes / 60).toString() : '');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(post?.challenge_time_limit_minutes ? (post.challenge_time_limit_minutes % 60).toString() : '');

  // Fetch merchants for champion selection
  useEffect(() => {
    if (titleOnTheLine && contractType === 'live_challenges') {
      fetchMerchants();
    }
  }, [titleOnTheLine, contractType]);

  // Load selected champion profile on edit
  useEffect(() => {
    if (post?.champion_user_id && mode === 'edit') {
      loadChampionProfile(post.champion_user_id);
    }
  }, [post?.champion_user_id, mode]);

  const loadChampionProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, business_name, avatar_url')
      .eq('id', userId)
      .single();
    if (data) setSelectedChampion(data);
  };

  const fetchMerchants = async () => {
    setLoadingMerchants(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, business_name, avatar_url')
      .eq('user_type', 'merchant')
      .order('display_name');
    setMerchantList(data || []);
    setLoadingMerchants(false);
  };

  const filteredMerchants = merchantList.filter(m => {
    const search = championSearch.toLowerCase();
    return (m.display_name?.toLowerCase().includes(search) || m.business_name?.toLowerCase().includes(search));
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bulletin-images')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('bulletin-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setLinkUrl('');
    setIsAdultContent(false);
    setPostType(initialPostType || 'regular');
    setContractType('');
    setYoutubeContractorShare('');
    setPieContractorShare('');
    setPieEpisodeCost('');
    setNumberOfOpportunities('');
    setUploadedImageUrl('');
    setSelectedFile(null);
    setImagePreview(null);
    setScheduledDate(undefined);
    setScheduledTime('');
    setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setChallengeType('');
    setTitleOnTheLine(false);
    setChallenger1Purse('');
    setChallenger2Purse('');
    setChampionPurse('');
    setChampionUserId('');
    setChampionSearch('');
    setSelectedChampion(null);
    setTimeLimitHours('');
    setTimeLimitMinutes('');
  };

  // Update form fields when post prop changes or when opening in edit mode
  useEffect(() => {
    if (post && mode === 'edit') {
      setTitle(post.title || '');
      setContent(post.content || '');
      setImageUrl(post.image_url || '');
      setLinkUrl(post.link_url || '');
      setIsAdultContent(post.is_adult_content || false);
      setPostType(post.post_type || 'regular');
      setContractType(post.contract_type || '');
      setYoutubeContractorShare(post.youtube_contractor_share?.toString() || '');
      setPieContractorShare(post.pie_contractor_share?.toString() || '');
      setPieEpisodeCost(post.pie_episode_cost?.toString() || '');
      setNumberOfOpportunities(post.number_of_opportunities?.toString() || '');
      setUploadedImageUrl(post.uploaded_image_url || '');
      setImagePreview(post.uploaded_image_url || null);
      setScheduledDate(post.scheduled_at ? new Date(post.scheduled_at) : undefined);
      setScheduledTime(post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '');
      setSelectedTimezone(post.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setChallengeType(post.challenge_type || '');
      setTitleOnTheLine(post.title_on_the_line || false);
      setChallenger1Purse(post.challenger1_purse?.toString() || '');
      setChallenger2Purse(post.challenger2_purse?.toString() || '');
      setChampionPurse(post.champion_purse?.toString() || '');
      setChampionUserId(post.champion_user_id || '');
      if (post.challenge_time_limit_minutes) {
        setTimeLimitHours(Math.floor(post.challenge_time_limit_minutes / 60).toString());
        setTimeLimitMinutes((post.challenge_time_limit_minutes % 60).toString());
      }
    }
  }, [post, mode]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && mode === 'create') {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate Live Challenges required fields
    if (postType === 'announcement' && contractType === 'live_challenges') {
      if (!scheduledDate || !scheduledTime) {
        toast({ title: "Required", description: "Please set a schedule date and time.", variant: "destructive" });
        return;
      }
      if (!challengeType) {
        toast({ title: "Required", description: "Please select a challenge type.", variant: "destructive" });
        return;
      }
      if (titleOnTheLine) {
        if (!championUserId) {
          toast({ title: "Required", description: "Please select a champion.", variant: "destructive" });
          return;
        }
        if (!challenger1Purse || parseFloat(challenger1Purse) <= 0) {
          toast({ title: "Required", description: "Please enter a challenger purse amount.", variant: "destructive" });
          return;
        }
        if (!championPurse || parseFloat(championPurse) <= 0) {
          toast({ title: "Required", description: "Please enter a champion purse amount.", variant: "destructive" });
          return;
        }
      } else {
        if (!challenger1Purse || parseFloat(challenger1Purse) <= 0) {
          toast({ title: "Required", description: "Please enter Challenger 1 purse amount.", variant: "destructive" });
          return;
        }
        if (!challenger2Purse || parseFloat(challenger2Purse) <= 0) {
          toast({ title: "Required", description: "Please enter Challenger 2 purse amount.", variant: "destructive" });
          return;
        }
      }
      const totalMinutes = (parseInt(timeLimitHours || '0') * 60) + parseInt(timeLimitMinutes || '0');
      if (totalMinutes <= 0) {
        toast({ title: "Required", description: "Please set a time limit for the challenge.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    
    try {
      // Upload image if selected
      let finalUploadedImageUrl = uploadedImageUrl;
      if (selectedFile) {
        finalUploadedImageUrl = await uploadImage();
        if (!finalUploadedImageUrl) {
          setLoading(false);
          return;
        }
      }

      // Build scheduled_at datetime
      let scheduledAtISO: string | null = null;
      if (contractType === 'live_challenges' && scheduledDate) {
        const dt = new Date(scheduledDate);
        if (scheduledTime) {
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          dt.setHours(hours, minutes, 0, 0);
        }
        scheduledAtISO = dt.toISOString();
      }

      const postData = {
        title,
        content,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        is_adult_content: isAdultContent,
        merchant_id: user.id,
        post_type: postType,
        contract_type: postType === 'announcement' && contractType ? contractType : null,
        youtube_contractor_share: postType === 'announcement' && youtubeContractorShare ? parseFloat(youtubeContractorShare) : null,
        pie_contractor_share: postType === 'announcement' && pieContractorShare ? parseFloat(pieContractorShare) : null,
        pie_episode_cost: postType === 'announcement' && pieEpisodeCost ? parseFloat(pieEpisodeCost) : null,
        number_of_opportunities: postType === 'announcement' && numberOfOpportunities ? parseInt(numberOfOpportunities) : null,
        uploaded_image_url: finalUploadedImageUrl || null,
        scheduled_at: scheduledAtISO,
        timezone: scheduledAtISO ? selectedTimezone : null,
        challenge_type: contractType === 'live_challenges' && challengeType ? challengeType : null,
        title_on_the_line: contractType === 'live_challenges' ? titleOnTheLine : false,
        challenger1_purse: contractType === 'live_challenges' && challenger1Purse ? parseFloat(challenger1Purse) : null,
        challenger2_purse: contractType === 'live_challenges' && !titleOnTheLine && challenger2Purse ? parseFloat(challenger2Purse) : null,
        champion_purse: contractType === 'live_challenges' && titleOnTheLine && championPurse ? parseFloat(championPurse) : null,
        champion_user_id: contractType === 'live_challenges' && titleOnTheLine && championUserId ? championUserId : null,
        challenge_time_limit_minutes: contractType === 'live_challenges' && (timeLimitHours || timeLimitMinutes) ? (parseInt(timeLimitHours || '0') * 60) + parseInt(timeLimitMinutes || '0') : null,
        updated_at: new Date().toISOString()
      };

      let error;

      if (mode === 'edit' && post) {
        const { error: updateError } = await supabase
          .from('bulletin_posts')
          .update(postData)
          .eq('id', post.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('bulletin_posts')
          .insert([postData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving post:', error);
        toast({
          title: "Error",
          description: `Failed to ${mode} post. Please try again.`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Post ${mode === 'edit' ? 'updated' : 'created'} successfully!`
      });

      // Reset form only for create mode
      if (mode === 'create') {
        resetForm();
      }
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: `Failed to ${mode} post. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-white hover:bg-gray-100 text-black">
          {mode === 'edit' ? (
            <>Edit Post</>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'edit' ? 'Edit Bulletin Post' : 'Create New Bulletin Post'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Type Selection */}
          <div>
            <Label htmlFor="postType" className="text-white">Post Type</Label>
            <Select value={postType} onValueChange={(value) => {
              setPostType(value);
              // Reset announcement fields when changing away from announcement
              if (value !== 'announcement') {
                setContractType('');
                setYoutubeContractorShare('');
                setPieContractorShare('');
                setPieEpisodeCost('');
                setNumberOfOpportunities('');
              }
            }}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contractType !== 'live_challenges' && (
            <div>
              <Label htmlFor="title" className="text-white">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title"
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="content" className="text-white">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              required
              rows={6}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          {/* Announcement-specific fields */}
          {postType === 'announcement' && (
            <>
              <div>
                <Label htmlFor="contractType" className="text-white">Contract Type</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select contract type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="asmr">ASMR</SelectItem>
                    <SelectItem value="modeling">Modeling</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="live_challenges">Live Challenges</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule Date/Time for Live Challenges */}
              {contractType === 'live_challenges' && (
                <div className="space-y-3">
                  <Label className="text-white">Schedule Date & Time <span className="text-red-400">*</span></Label>
                  <div className="flex gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
                            !scheduledDate && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-32 bg-gray-700 border-gray-600 text-white"
                    />
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger className="w-44 bg-gray-700 border-gray-600 text-white text-xs">
                        <SelectValue placeholder="Timezone" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                        <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                        <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                        <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                        <SelectItem value="Europe/London">GMT/BST</SelectItem>
                        <SelectItem value="Europe/Paris">CET/CEST</SelectItem>
                        <SelectItem value="Asia/Tokyo">JST</SelectItem>
                        <SelectItem value="Australia/Sydney">AEST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-400">
                    Set when this live challenge will take place
                  </p>
                </div>
              )}

              {/* Challenge Type Selection for Live Challenges */}
              {contractType === 'live_challenges' && (
                <Card className="bg-gray-700/50 border-gray-600">
                  <CardContent className="p-4 space-y-4">
                    <Label className="text-white font-medium">Type of Challenge <span className="text-red-400">*</span></Label>
                    <RadioGroup value={challengeType} onValueChange={(val) => {
                      setChallengeType(val);
                      const label = [
                        { value: 'cook_off', label: 'Cook-off' },
                        { value: 'bake_off', label: 'Bake-off' },
                        { value: 'twerk_off', label: 'Twerk-off' },
                        { value: 'pole_dance', label: 'Pole Dance' },
                        { value: 'trivia', label: 'Trivia' },
                      ].find(c => c.value === val)?.label || '';
                      setTitle(`Live Challenge: ${label}`);
                    }} className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'cook_off', label: 'Cook-off' },
                        { value: 'bake_off', label: 'Bake-off' },
                        { value: 'twerk_off', label: 'Twerk-off' },
                        { value: 'pole_dance', label: 'Pole Dance' },
                        { value: 'trivia', label: 'Trivia' },
                      ].map((challenge) => (
                        <div key={challenge.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={challenge.value} id={challenge.value} className="border-gray-400 text-white" />
                          <Label htmlFor={challenge.value} className="text-gray-200 cursor-pointer text-sm">{challenge.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* Title on the Line */}
                    <div className="flex items-center space-x-3 pt-2 border-t border-gray-600">
                      <Checkbox
                        id="titleOnTheLine"
                        checked={titleOnTheLine}
                        onCheckedChange={(checked) => setTitleOnTheLine(checked === true)}
                      />
                      <div className="flex items-center gap-2">
                        <img src={pieTitleBelt} alt="Championship belt" className="w-[22px] h-[14px] flex-shrink-0 object-contain" />
                        <Label htmlFor="titleOnTheLine" className="text-white cursor-pointer font-medium">
                          Title is on the line
                        </Label>
                      </div>
                    </div>
                    {titleOnTheLine && (
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400">
                          🏆 The champion's title will be at stake in this challenge!
                        </p>
                        
                        {/* Champion Selector */}
                        <div className="space-y-2">
                          <Label className="text-white text-sm flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            Select Champion <span className="text-red-400">*</span>
                          </Label>
                          
                          {selectedChampion ? (
                            <div className="flex items-center gap-3 bg-gray-600/50 p-3 rounded-lg border border-yellow-600/30">
                              <Avatar className="h-10 w-10 border-2 border-yellow-500">
                                <AvatarImage src={selectedChampion.avatar_url || ''} />
                                <AvatarFallback className="bg-yellow-600 text-white text-sm">
                                  {(selectedChampion.display_name || selectedChampion.business_name || '?')[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">{selectedChampion.display_name || selectedChampion.business_name}</p>
                                <p className="text-yellow-400 text-xs">Current Champion</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedChampion(null); setChampionUserId(''); }}
                                className="text-gray-400 hover:text-white"
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                  placeholder="Search merchants..."
                                  value={championSearch}
                                  onChange={(e) => setChampionSearch(e.target.value)}
                                  className="pl-9 bg-gray-600 border-gray-500 text-white"
                                />
                              </div>
                              <ScrollArea className="h-40 border border-gray-600 rounded-lg">
                                {loadingMerchants ? (
                                  <p className="text-gray-400 text-sm text-center py-4">Loading...</p>
                                ) : filteredMerchants.length === 0 ? (
                                  <p className="text-gray-400 text-sm text-center py-4">No merchants found</p>
                                ) : (
                                  <div className="p-1">
                                    {filteredMerchants.map((merchant) => (
                                      <button
                                        key={merchant.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedChampion(merchant);
                                          setChampionUserId(merchant.id);
                                          setChampionSearch('');
                                        }}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-600 transition-colors text-left"
                                      >
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={merchant.avatar_url || ''} />
                                          <AvatarFallback className="bg-gray-500 text-white text-xs">
                                            {(merchant.display_name || merchant.business_name || '?')[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-white text-sm">{merchant.display_name || merchant.business_name || 'Unknown'}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Purse Amounts Section */}
                    <div className="pt-3 border-t border-gray-600 space-y-3">
                      <Label className="text-white font-medium">💰 Purse Amounts (USD) <span className="text-red-400">*</span></Label>
                      
                      {titleOnTheLine ? (
                        /* Title on the line: Challenger vs Champion */
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-sm">Challenger Purse</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={challenger1Purse}
                                onChange={(e) => setChallenger1Purse(e.target.value)}
                                placeholder="0.00"
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                              {challenger1Purse && parseFloat(challenger1Purse) > 0 && (
                                <SixthPriceTag usdPrice={parseFloat(challenger1Purse)} size="md" />
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm">Champion Purse</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={championPurse}
                                onChange={(e) => setChampionPurse(e.target.value)}
                                placeholder="0.00"
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                              {championPurse && parseFloat(championPurse) > 0 && (
                                <SixthPriceTag usdPrice={parseFloat(championPurse)} size="md" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* No title: Challenger vs Challenger */
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-sm">Challenger 1 Purse</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={challenger1Purse}
                                onChange={(e) => setChallenger1Purse(e.target.value)}
                                placeholder="0.00"
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                              {challenger1Purse && parseFloat(challenger1Purse) > 0 && (
                                <SixthPriceTag usdPrice={parseFloat(challenger1Purse)} size="md" />
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm">Challenger 2 Purse</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={challenger2Purse}
                                onChange={(e) => setChallenger2Purse(e.target.value)}
                                placeholder="0.00"
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                              {challenger2Purse && parseFloat(challenger2Purse) > 0 && (
                                <SixthPriceTag usdPrice={parseFloat(challenger2Purse)} size="md" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Limit */}
                    <div className="pt-3 border-t border-gray-600">
                      <Label className="text-white font-medium">⏱️ Time Limit <span className="text-red-400">*</span></Label>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={timeLimitHours}
                            onChange={(e) => setTimeLimitHours(e.target.value)}
                            placeholder="0"
                            className="w-20 bg-gray-600 border-gray-500 text-white text-center"
                          />
                          <span className="text-gray-300 text-sm">hrs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={timeLimitMinutes}
                            onChange={(e) => setTimeLimitMinutes(e.target.value)}
                            placeholder="0"
                            className="w-20 bg-gray-600 border-gray-500 text-white text-center"
                          />
                          <span className="text-gray-300 text-sm">min</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="opportunities" className="text-white">Number of Opportunities - Optional</Label>
                <Input
                  id="opportunities"
                  type="number"
                  min="1"
                  value={numberOfOpportunities}
                  onChange={(e) => setNumberOfOpportunities(e.target.value)}
                  placeholder="1"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </>
          )}

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label className="text-white">Image</Label>
            
            {/* File Upload */}
            <div>
              <Label htmlFor="imageFile" className="text-white text-sm">Upload Image (Optional)</Label>
              <div className="mt-1">
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="bg-gray-700 border-gray-600 text-white file:bg-gray-600 file:text-white file:border-0 file:rounded file:px-4 file:py-2"
                />
              </div>
              {imagePreview && (
                <div className="mt-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </div>

            {/* Image URL */}
            <div>
              <Label htmlFor="imageUrl" className="text-white text-sm">Or use Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="linkUrl" className="text-white">Link URL (Optional)</Label>
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com or /store or /films"
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Add a link to another page (internal like /store or external like https://example.com)
            </p>
          </div>

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content_bulletin" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if your post contains adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content_bulletin"
              checked={isAdultContent}
              onCheckedChange={setIsAdultContent}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-white hover:bg-gray-100 text-black border-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading}
              className="bg-white hover:bg-gray-100 text-black"
            >
              {loading || uploading ? 'Saving...' : (mode === 'edit' ? 'Update Post' : 'Create Post')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulletinPostModal;
