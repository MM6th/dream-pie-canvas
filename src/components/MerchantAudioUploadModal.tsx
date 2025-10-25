import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Plus, AudioLines, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AudioPreviewPlayer from "@/components/AudioPreviewPlayer";

interface MerchantAudioUploadModalProps {
  onSuccess: () => void;
}

const MerchantAudioUploadModal = ({ onSuccess }: MerchantAudioUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    thumbnail: null as File | null,
    audioFile: null as File | null,
    albumName: "",
    hasAlbum: false,
    previewStartTime: 0,
    is_adult_content: false,
    description: ""
  });
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [albums, setAlbums] = useState<any[]>([]);
  
  const [tracks, setTracks] = useState<Array<{
    audioFile: File | null;
    title: string;
    featuringArtistName: string;
    featuringArtistPaypal: string;
    featuringPercentage: number;
  }>>([{
    audioFile: null,
    title: '',
    featuringArtistName: '',
    featuringArtistPaypal: '',
    featuringPercentage: 30
  }]);

  const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200MB
  const MAX_THUMBNAIL_SIZE = 50 * 1024 * 1024; // 50MB

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
    const file = e.target.files?.[0];
    if (file && validateFileSize(file, 'audio')) {
      setFormData(prev => ({ ...prev, audioFile: file }));
      
      // Load audio duration for preview
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
    } else {
      e.target.value = '';
      setFormData(prev => ({ ...prev, audioFile: null }));
      setAudioDuration(0);
    }
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
      featuringPercentage: 30
    }]);
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  React.useEffect(() => {
    if (open) {
      fetchAlbums();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

        const { data: newAlbum, error: albumError } = await supabase
          .from('albums')
          .insert({
            merchant_id: user.id,
            name: formData.albumName,
            description: formData.description || null
          })
          .select()
          .single();
        
        if (albumError) throw albumError;

        // Upload each track
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];

          // Upload audio file
          const audioUrl = await uploadFile(track.audioFile!, 'audio-files', `${user.id}/`);

          // Create audio product
          const { data: audioProduct, error: productError } = await supabase
            .from('audio_products')
            .insert({
              merchant_id: user.id,
              title: track.title,
              artist_name: formData.artistName || null,
              audio_type: 'music',
              thumbnail_url: thumbnailUrl,
              audio_file_url: audioUrl,
              album_id: newAlbum.id,
              access_level: 'public',
              is_free: true,
              is_adult_content: formData.is_adult_content
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
          thumbnail: null,
          audioFile: null,
          albumName: '',
          hasAlbum: false,
          previewStartTime: 0,
          is_adult_content: false,
          description: ''
        });
        setTracks([{
          audioFile: null,
          title: '',
          featuringArtistName: '',
          featuringArtistPaypal: '',
          featuringPercentage: 30
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
    
    // Single file upload logic
    if (!formData.title || !formData.artistName || !formData.audioFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const audioUrl = await uploadFile(formData.audioFile, 'audio-files', `${user.id}/`);
      
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(formData.thumbnail, 'thumbnails', `${user.id}/`);
      }

      const { error: productError } = await supabase
        .from('audio_products')
        .insert({
          merchant_id: user.id,
          title: formData.title,
          artist_name: formData.artistName,
          audio_type: 'music',
          thumbnail_url: thumbnailUrl,
          audio_file_url: audioUrl,
          album_id: null,
          access_level: 'public',
          is_free: true,
          is_adult_content: formData.is_adult_content,
          preview_start_time: formData.previewStartTime,
          preview_duration: 30
        });
      
      if (productError) throw productError;
      
      toast({
        title: "Success",
        description: "Music track uploaded successfully!"
      });
      
      setOpen(false);
      setFormData({
        title: "",
        artistName: "",
        thumbnail: null,
        audioFile: null,
        albumName: "",
        hasAlbum: false,
        previewStartTime: 0,
        is_adult_content: false,
        description: ""
      });
      onSuccess();
      
    } catch (error: any) {
      console.error('Error uploading music:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload music",
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
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Upload Music
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AudioLines className="w-5 h-5" />
            Upload Music
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Part of album toggle */}
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
              {formData.audioFile && audioDuration > 0 && (
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
            <Label htmlFor="artistName">Artist Name *</Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Artist or creator name"
              required
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

              <div>
                <Label htmlFor="description">Album Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Describe your album"
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
                        onChange={(e) => updateTrack(index, 'audioFile', e.target.files?.[0] || null)}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>

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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Uploading..." : formData.hasAlbum ? "Upload Album" : "Upload Track"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantAudioUploadModal;
