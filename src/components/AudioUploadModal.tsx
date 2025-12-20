import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import MultiImagePicker from "@/components/MultiImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Upload, AudioLines, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AudioPreviewPlayer from "@/components/AudioPreviewPlayer";

interface AudioUploadModalProps {
  onSuccess: () => void;
}

const AudioUploadModal = ({ onSuccess }: AudioUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    audioType: "",
    description: "",
    thumbnail: null as File | null,
    audioFile: null as File | null,
    albumName: "",
    hasAlbum: false,
    accessLevel: "public" as "public" | "merchant_only" | "paid",
    price: "",
    pieVideoPrice: "",
    youtubeMembershipFee: "",
    maxDownloads: "",
    is_adult_content: false,
    // ASMR-specific fields
    backEndRoyalties: false,
    piePhotoEditing: false,
    coverPhotos: [] as File[],
    advanceFeeRate: "",
    numberOfOpportunities: "",
    isPieExclusive: false,
    // Music preview fields
    previewStartTime: 0
  });
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioPreviewRef = React.useRef<HTMLAudioElement>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  
  const [tracks, setTracks] = useState<Array<{
    audioFile: File | null;
    title: string;
    featuringArtistName: string;
    featuringArtistPaypal: string;
    featuringPercentage: number;
    previewStartTime: number;
    audioDuration: number;
  }>>([{
    audioFile: null,
    title: '',
    featuringArtistName: '',
    featuringArtistPaypal: '',
    featuringPercentage: 30,
    previewStartTime: 0,
    audioDuration: 0
  }]);

  const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200MB for audio files
  const MAX_THUMBNAIL_SIZE = 50 * 1024 * 1024; // 50MB for thumbnails

  const validateFileSize = (file: File, type: 'audio' | 'thumbnail') => {
    const maxSize = type === 'audio' ? MAX_AUDIO_SIZE : MAX_THUMBNAIL_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      toast({
        title: "File too large",
        description: `${type === 'audio' ? 'Audio' : 'Thumbnail'} file must be smaller than ${maxSizeMB}MB`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, 'audio')) {
      setFormData(prev => ({ ...prev, audioFile: file }));
      
      // Load audio duration for music type
      if (formData.audioType === 'music' && file) {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration);
          URL.revokeObjectURL(audio.src);
        };
      }
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, audioFile: null }));
      setAudioDuration(0);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, 'thumbnail')) {
      setFormData(prev => ({ ...prev, thumbnail: file }));
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, thumbnail: null }));
    }
  };

  const fetchAlbums = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('merchant_id', user.id);
      
      if (error) throw error;
      setAlbums(data || []);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const addTrack = () => {
    if (tracks.length >= 20) {
      toast({ title: "Limit Reached", description: "Maximum 20 tracks per album", variant: "destructive" });
      return;
    }
    setTracks([...tracks, {
      audioFile: null,
      title: '',
      featuringArtistName: '',
      featuringArtistPaypal: '',
      featuringPercentage: 30,
      previewStartTime: 0,
      audioDuration: 0
    }]);
  };

  const handleTrackAudioChange = (index: number, file: File | null) => {
    if (file) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        const newTracks = [...tracks];
        newTracks[index] = { 
          ...newTracks[index], 
          audioFile: file,
          audioDuration: audio.duration,
          previewStartTime: 0
        };
        setTracks(newTracks);
        URL.revokeObjectURL(audio.src);
      };
    } else {
      updateTrack(index, 'audioFile', null);
      updateTrack(index, 'audioDuration', 0);
      updateTrack(index, 'previewStartTime', 0);
    }
  };

  const removeTrack = (index: number) => {
    if (tracks.length <= 2) {
      toast({ title: "Minimum Required", description: "Albums must have at least 2 tracks", variant: "destructive" });
      return;
    }
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const updateTrack = (index: number, field: string, value: any) => {
    const newTracks = [...tracks];
    newTracks[index] = { ...newTracks[index], [field]: value };
    setTracks(newTracks);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!user) return;
    
    // Multi-track album upload
    if (formData.hasAlbum) {
      setLoading(true);
      
      try {
        // Validation
        if (tracks.length < 2) {
          toast({ title: "Error", description: "Albums must have at least 2 tracks", variant: "destructive" });
          return;
        }

        // Validate artist name for music albums
        if (!formData.artistName) {
          toast({ title: "Error", description: "Artist name is required for music albums", variant: "destructive" });
          return;
        }

        const trackTitles = tracks.map(t => t.title);
        const uniqueTitles = new Set(trackTitles);
        if (trackTitles.length !== uniqueTitles.size) {
          toast({ title: "Error", description: "All track titles must be unique", variant: "destructive" });
          return;
        }

        // Validate featuring artist data
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (!track.audioFile || !track.title) {
            toast({ title: "Error", description: `Track ${i + 1}: Missing audio file or title`, variant: "destructive" });
            return;
          }
          if (track.featuringArtistName && !track.featuringArtistPaypal) {
            toast({ title: "Error", description: `Track ${i + 1}: Featuring artist PayPal email is required`, variant: "destructive" });
            return;
          }
          if (track.featuringArtistPaypal && !emailRegex.test(track.featuringArtistPaypal)) {
            toast({ title: "Error", description: `Track ${i + 1}: Invalid PayPal email format`, variant: "destructive" });
            return;
          }
        }

        // Upload thumbnail once (mandatory)
        if (!formData.thumbnail) {
          toast({ title: "Error", description: "Album thumbnail is required", variant: "destructive" });
          return;
        }

        const thumbnailUrl = await uploadFile(formData.thumbnail, 'thumbnails', `${user.id}/`);

        // Create album
        if (!formData.albumName) {
          toast({ title: "Error", description: "Album name is required", variant: "destructive" });
          return;
        }

        // Create album with pricing info (Option B: price on album, not tracks)
        const { data: newAlbum, error: albumError } = await supabase
          .from('albums')
          .insert({
            merchant_id: user.id,
            name: formData.albumName,
            description: formData.description || null,
            price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
            is_free: formData.accessLevel !== 'paid',
            access_level: formData.accessLevel,
            status: isDraft ? 'draft' : 'published',
            published_at: isDraft ? null : new Date().toISOString(),
            thumbnail_url: thumbnailUrl,
            audio_type: formData.audioType,
            is_adult_content: formData.is_adult_content
          })
          .select()
          .single();
        
        if (albumError) throw albumError;

        // Upload each track (no individual pricing - album holds the price)
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];

          // Upload audio file
          const audioUrl = await uploadFile(track.audioFile!, 'audio-files', `${user.id}/`);

          // Create audio product (tracks have no individual price)
          const { data: audioProduct, error: productError } = await supabase
            .from('audio_products')
            .insert({
              merchant_id: user.id,
              title: track.title,
              artist_name: formData.artistName || null,
              audio_type: formData.audioType,
              thumbnail_url: thumbnailUrl,
              audio_file_url: audioUrl,
              album_id: newAlbum.id,
              access_level: 'public', // Tracks inherit album access
              is_free: true, // Individual tracks are free (album has price)
              price: null, // No individual track pricing
              is_adult_content: formData.is_adult_content,
              status: isDraft ? 'draft' : 'published',
              published_at: isDraft ? null : new Date().toISOString(),
              preview_start_time: track.previewStartTime,
              preview_duration: 30
            })
            .select()
            .single();

          if (productError) throw productError;

          // Validate featuring artist PayPal if provided
          let featuringUserId = null;
          if (track.featuringArtistName && track.featuringArtistPaypal) {
            const { data: featuringProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('paypal_email', track.featuringArtistPaypal)
              .maybeSingle();

            featuringUserId = featuringProfile?.id || null;
          }

          // Create album_tracks entry
          const { error: trackError } = await supabase
            .from('album_tracks')
            .insert({
              album_id: newAlbum.id,
              audio_product_id: audioProduct.id,
              track_number: i + 1,
              featuring_artist_name: track.featuringArtistName || null,
              featuring_artist_paypal: track.featuringArtistPaypal || null,
              featuring_artist_user_id: featuringUserId,
              featuring_percentage: track.featuringPercentage
            });

          if (trackError) throw trackError;
        }

        toast({ title: "Success", description: `Album "${formData.albumName}" with ${tracks.length} tracks uploaded!` });
        setOpen(false);
        setFormData({
          title: '',
          artistName: '',
          audioType: '',
          description: '',
          thumbnail: null,
          audioFile: null,
          albumName: '',
          hasAlbum: false,
          accessLevel: 'public',
          price: '',
          pieVideoPrice: '',
          youtubeMembershipFee: '',
          maxDownloads: '',
          is_adult_content: false,
          backEndRoyalties: false,
          piePhotoEditing: false,
          coverPhotos: [],
          advanceFeeRate: '',
          numberOfOpportunities: '',
          isPieExclusive: false,
          previewStartTime: 0
        });
        setTracks([{
          audioFile: null,
          title: '',
          featuringArtistName: '',
          featuringArtistPaypal: '',
          featuringPercentage: 30,
          previewStartTime: 0,
          audioDuration: 0
        }]);
        onSuccess();

      } catch (error: any) {
        console.error('Error uploading album:', error);
        toast({ title: "Error", description: error.message || "Failed to upload album", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Single file upload logic (existing)
    if (!formData.title || !formData.audioType || !formData.audioFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate artist name for music type
    if (formData.audioType === 'music' && !formData.artistName) {
      toast({
        title: "Error",
        description: "Artist name is required for music uploads",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload audio file
      const audioUrl = await uploadFile(
        formData.audioFile, 
        'audio-files', 
        `${user.id}/`
      );
      
      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(
          formData.thumbnail, 
          'thumbnails', 
          `${user.id}/`
        );
      }
      
      // Handle album creation/selection
      let albumId = null;
      if (formData.hasAlbum && formData.albumName) {
        // Check if album exists
        const existingAlbum = albums.find(album => 
          album.name.toLowerCase() === formData.albumName.toLowerCase()
        );
        
        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          // Create new album
          const { data: newAlbum, error: albumError } = await supabase
            .from('albums')
            .insert({
              merchant_id: user.id,
              name: formData.albumName
            })
            .select()
            .single();
          
          if (albumError) throw albumError;
          albumId = newAlbum.id;
        }
      }

      // ASMR-specific photo uploads
      let coverPhotoUrls: string[] = [];
      if (formData.audioType === 'asmr' && formData.coverPhotos && formData.coverPhotos.length > 0) {
        coverPhotoUrls = await Promise.all(
          formData.coverPhotos.map(async (photo) => {
            return await uploadFile(photo, 'asmr-covers', `${user.id}/`);
          })
        );
      }
      
      const insertData: any = {
        merchant_id: user.id,
        title: formData.title,
        artist_name: formData.artistName || null,
        audio_type: formData.audioType,
        thumbnail_url: thumbnailUrl,
        audio_file_url: audioUrl,
        album_id: albumId,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        pie_video_price: formData.audioType === 'podcast' && formData.pieVideoPrice ? parseFloat(formData.pieVideoPrice) : null,
        youtube_membership_fee: formData.audioType === 'podcast' && formData.youtubeMembershipFee ? parseFloat(formData.youtubeMembershipFee) : null,
        podcast_contract_generated: false,
        max_downloads: formData.accessLevel === 'merchant_only' && formData.maxDownloads ? parseInt(formData.maxDownloads) : null,
        is_adult_content: formData.is_adult_content,
        // Music preview fields
        preview_start_time: formData.audioType === 'music' ? formData.previewStartTime : 0,
        preview_duration: formData.audioType === 'music' ? 30 : null,
        // Draft/Published status
        status: isDraft ? 'draft' : 'published',
        published_at: isDraft ? null : new Date().toISOString()
      };

      // Add description for podcasts and ASMR if provided
      if ((formData.audioType === 'podcast' || formData.audioType === 'asmr') && formData.description) {
        insertData.description = formData.description;
      }

      // Add ASMR-specific fields
      if (formData.audioType === 'asmr') {
        insertData.back_end_royalties = formData.backEndRoyalties;
        insertData.pie_photo_editing = formData.piePhotoEditing;
        insertData.cover_photos = coverPhotoUrls;
        insertData.advance_fee_rate = formData.advanceFeeRate ? parseFloat(formData.advanceFeeRate) : null;
        insertData.number_of_opportunities = formData.numberOfOpportunities ? parseInt(formData.numberOfOpportunities) : null;
        insertData.opportunities_exhausted = false;
        insertData.is_pie_exclusive = formData.isPieExclusive;
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .insert(insertData);
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: isDraft ? "Audio product saved as draft!" : "Audio product uploaded successfully!"
      });
      
      setOpen(false);
      setFormData({
        title: "",
        artistName: "",
        audioType: "",
        description: "",
        thumbnail: null,
        audioFile: null,
        albumName: "",
        hasAlbum: false,
        accessLevel: "public",
        price: "",
        pieVideoPrice: "",
        youtubeMembershipFee: "",
        maxDownloads: "",
        is_adult_content: false,
        backEndRoyalties: false,
        piePhotoEditing: false,
        coverPhotos: [],
        advanceFeeRate: "",
        numberOfOpportunities: "",
        isPieExclusive: false,
        previewStartTime: 0
      });
      onSuccess();
      
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchAlbums();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Audio Content
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white"
        onInteractOutside={(e) => {
          // Prevent closing when file input is triggered on mobile
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' && target.getAttribute('type') === 'file') {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AudioLines className="w-5 h-5" />
            Upload Audio Content
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="audioType">Audio Type *</Label>
            <Select
              value={formData.audioType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, audioType: value }))}
              required
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select audio type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="asmr">ASMR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Part of album toggle - only show for music */}
          {formData.audioType === 'music' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="hasAlbum"
                checked={formData.hasAlbum}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  hasAlbum: checked as boolean 
                }))}
              />
              <Label htmlFor="hasAlbum">Part of an album/collection</Label>
            </div>
          )}

          {/* Single file upload - only show if not part of album */}
          {!formData.hasAlbum && (
            <>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="audioFile">Audio File *</Label>
                <Input
                  id="audioFile"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended formats: MP3, WAV, M4A. Max size: 200MB
                </p>
              </div>

              {/* Music Preview Selection */}
              {formData.audioType === 'music' && formData.audioFile && audioDuration > 0 && (
                <div className="space-y-3 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
                  <Label>30-Second Preview Selection</Label>
                  <p className="text-xs text-gray-400">
                    Choose which 30 seconds of your song to use as a preview in the store
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Preview: {Math.floor(formData.previewStartTime / 60)}:{Math.floor(formData.previewStartTime % 60).toString().padStart(2, '0')}</span>
                      <span>to {Math.floor((formData.previewStartTime + 30) / 60)}:{Math.floor((formData.previewStartTime + 30) % 60).toString().padStart(2, '0')}</span>
                    </div>
                    
                    <Slider
                      value={[formData.previewStartTime]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, previewStartTime: value[0] }))}
                      max={Math.max(0, audioDuration - 30)}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0:00</span>
                      <span>{Math.floor(audioDuration / 60)}:{Math.floor(audioDuration % 60).toString().padStart(2, '0')}</span>
                    </div>

                    {formData.audioFile && (
                      <AudioPreviewPlayer
                        audioUrl={URL.createObjectURL(formData.audioFile)}
                        previewStartTime={formData.previewStartTime}
                        previewDuration={30}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          <div>
            <Label htmlFor="artistName">
              Artist Name {formData.audioType === 'music' && '*'}
            </Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Artist or creator name"
              required={formData.audioType === 'music'}
            />
          </div>
          
          <div>
            <Label htmlFor="thumbnail">
              {formData.hasAlbum ? 'Album Cover (Required) *' : 'Thumbnail Image (Optional, Max 50MB)'}
            </Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="bg-gray-700 border-gray-600 text-white"
              required={formData.hasAlbum}
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended formats: JPG, PNG. Max size: 50MB{formData.hasAlbum ? ' - One cover for entire album' : ''}
            </p>
          </div>
          
          {formData.hasAlbum && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="albumName">Album/Collection Name *</Label>
                <Input
                  id="albumName"
                  value={formData.albumName}
                  onChange={(e) => setFormData(prev => ({ ...prev, albumName: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter album name"
                  required
                />
              </div>

              {/* Multi-Track Upload Interface */}
              <div className="space-y-4 border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-white">Album Tracks (Minimum 2)</h3>
                {tracks.map((track, index) => (
                  <div key={index} className="space-y-3 p-4 bg-purple-900/20 rounded-lg border border-purple-700">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Track {index + 1}</Label>
                      {tracks.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrack(index)}
                          className="h-6 px-2 text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`track-file-${index}`}>Audio File *</Label>
                      <Input
                        id={`track-file-${index}`}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleTrackAudioChange(index, e.target.files?.[0] || null)}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>

                    {/* 30-Second Preview Selection for Track */}
                    {track.audioFile && track.audioDuration > 0 && (
                      <div className="space-y-3 p-3 bg-blue-900/20 rounded-lg border border-blue-700">
                        <Label className="text-sm">30-Second Preview Selection</Label>
                        <p className="text-xs text-gray-400">
                          Choose which 30 seconds to use as a preview for this track
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Preview: {Math.floor(track.previewStartTime / 60)}:{Math.floor(track.previewStartTime % 60).toString().padStart(2, '0')}</span>
                            <span>to {Math.floor((track.previewStartTime + 30) / 60)}:{Math.floor((track.previewStartTime + 30) % 60).toString().padStart(2, '0')}</span>
                          </div>
                          
                          <Slider
                            value={[track.previewStartTime]}
                            onValueChange={(value) => updateTrack(index, 'previewStartTime', value[0])}
                            max={Math.max(0, track.audioDuration - 30)}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>0:00</span>
                            <span>{Math.floor(track.audioDuration / 60)}:{Math.floor(track.audioDuration % 60).toString().padStart(2, '0')}</span>
                          </div>

                          <AudioPreviewPlayer
                            audioUrl={URL.createObjectURL(track.audioFile)}
                            previewStartTime={track.previewStartTime}
                            previewDuration={30}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor={`track-title-${index}`}>Track Title *</Label>
                      <Input
                        id={`track-title-${index}`}
                        value={track.title}
                        onChange={(e) => updateTrack(index, 'title', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter track title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`featuring-artist-${index}`}>Featuring Artist (Optional)</Label>
                      <Input
                        id={`featuring-artist-${index}`}
                        value={track.featuringArtistName}
                        onChange={(e) => updateTrack(index, 'featuringArtistName', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="e.g., Artist Name"
                      />
                    </div>

                    {track.featuringArtistName && (
                      <>
                        <div>
                          <Label htmlFor={`featuring-paypal-${index}`}>Featuring Artist PayPal Email *</Label>
                          <Input
                            id={`featuring-paypal-${index}`}
                            type="email"
                            value={track.featuringArtistPaypal}
                            onChange={(e) => updateTrack(index, 'featuringArtistPaypal', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="artist@paypal.com"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor={`featuring-percentage-${index}`}>
                            Featuring Artist Revenue Share: {track.featuringPercentage}%
                          </Label>
                          <Input
                            id={`featuring-percentage-${index}`}
                            type="range"
                            min="10"
                            max="50"
                            step="5"
                            value={track.featuringPercentage}
                            onChange={(e) => updateTrack(index, 'featuringPercentage', parseInt(e.target.value))}
                            className="w-full cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>10%</span>
                            <span>50%</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {tracks.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTrack}
                    className="w-full border-purple-700 text-purple-300 hover:bg-purple-900/30"
                  >
                    + Add Track
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Conditional fields based on audio type */}
          {formData.audioType === 'podcast' && (
            <>
              <div>
                <Label htmlFor="pieVideoPrice">Pie Video Price (Optional)</Label>
                <Input
                  id="pieVideoPrice"
                  type="number"
                  value={formData.pieVideoPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, pieVideoPrice: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Price in USD"
                />
              </div>

              <div>
                <Label htmlFor="youtubeMembershipFee">YouTube Membership Fee (Optional)</Label>
                <Input
                  id="youtubeMembershipFee"
                  type="number"
                  value={formData.youtubeMembershipFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtubeMembershipFee: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Fee in USD"
                />
              </div>
            </>
          )}

          {formData.accessLevel === 'merchant_only' && (
            <div>
              <Label htmlFor="maxDownloads">Max Downloads (Merchant Only)</Label>
              <Input
                id="maxDownloads"
                type="number"
                value={formData.maxDownloads}
                onChange={(e) => setFormData(prev => ({ ...prev, maxDownloads: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Maximum number of downloads"
              />
            </div>
          )}

          <div>
            <Label htmlFor="accessLevel">Access Level *</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value) => setFormData(prev => ({ ...prev, accessLevel: value as "public" | "merchant_only" | "paid" }))}
              required
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="merchant_only">Merchant Only</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accessLevel === 'paid' && (
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Price in USD"
                required
              />
            </div>
          )}

          {formData.audioType === 'asmr' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backEndRoyalties"
                  checked={formData.backEndRoyalties}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    backEndRoyalties: checked as boolean
                  }))}
                />
                <Label htmlFor="backEndRoyalties">Back-End Royalties</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="piePhotoEditing"
                  checked={formData.piePhotoEditing}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    piePhotoEditing: checked as boolean
                  }))}
                />
                <Label htmlFor="piePhotoEditing">Pie Photo Editing</Label>
              </div>

              <div>
                <Label>Cover Photos (Multiple)</Label>
                <MultiImagePicker
                  selectedImages={formData.coverPhotos}
                  onImagesChange={(files: File[]) => setFormData(prev => ({ ...prev, coverPhotos: files }))}
                  maxImages={10}
                />
                <p className="text-xs text-gray-400 mt-1">Upload multiple cover photos for ASMR content</p>
              </div>

              <div>
                <Label htmlFor="advanceFeeRate">Advance Fee Rate (Optional)</Label>
                <Input
                  id="advanceFeeRate"
                  type="number"
                  value={formData.advanceFeeRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, advanceFeeRate: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter advance fee rate"
                />
              </div>

              <div>
                <Label htmlFor="numberOfOpportunities">Number of Opportunities (Optional)</Label>
                <Input
                  id="numberOfOpportunities"
                  type="number"
                  value={formData.numberOfOpportunities}
                  onChange={(e) => setFormData(prev => ({ ...prev, numberOfOpportunities: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter number of opportunities"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPieExclusive"
                  checked={formData.isPieExclusive}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    isPieExclusive: checked as boolean
                  }))}
                />
                <Label htmlFor="isPieExclusive">Is Pie Exclusive</Label>
              </div>
            </div>
          )}
          
          {(formData.audioType === 'podcast' || formData.audioType === 'asmr') && (
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Describe your content"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_adult_content"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                is_adult_content: checked as boolean 
              }))}
            />
            <Label htmlFor="is_adult_content" className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-500" />
              Mark as Adult/Mature Content
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              disabled={loading} 
              onClick={(e) => handleSubmit(e as any, true)}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Draft"}
            </Button>
            <Button 
              type="button" 
              disabled={loading} 
              onClick={(e) => {
                if (window.confirm("⚠️ Once published, you cannot edit or delete this music. You'll need to contact administration to remove it. Are you sure you want to publish?")) {
                  handleSubmit(e as any, false);
                }
              }}
              className="flex-1"
            >
              {loading ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AudioUploadModal;
