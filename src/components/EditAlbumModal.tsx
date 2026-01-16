import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Lock, Music, ChevronDown, ChevronUp, Plus, Trash2, Upload, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AudioPreviewPlayer from "./AudioPreviewPlayer";

interface TrackData {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  preview_start_time: number;
  audioDuration: number;
}

interface NewTrackData {
  audioFile: File | null;
  title: string;
  featuringArtistName: string;
  featuringArtistPaypal: string;
  featuringPercentage: number;
  previewStartTime: number;
  audioDuration: number;
  audioPreviewUrl: string;
}

interface Album {
  id: string;
  name: string;
  thumbnail_url: string | null;
  status: string;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  is_adult_content: boolean | null;
  tracks?: any[];
  preview_track_id?: string | null;
}

interface EditAlbumModalProps {
  album: Album;
  onSuccess: () => void;
  onClose: () => void;
}

const EditAlbumModal = ({ album, onSuccess, onClose }: EditAlbumModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const isPublished = album.status === 'published';
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: album.name,
    thumbnail: null as File | null,
    accessLevel: (album.access_level || (album.is_free ? "public" : "paid")) as "public" | "merchant_only" | "paid",
    price: album.price?.toString() || "",
  });
  const [isAdultContent, setIsAdultContent] = useState(album.is_adult_content || false);
  const [tracksData, setTracksData] = useState<TrackData[]>([]);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [selectedPreviewTrackId, setSelectedPreviewTrackId] = useState<string | null>(album.preview_track_id || null);
  
  // New tracks state
  const [newTracks, setNewTracks] = useState<NewTrackData[]>([]);
  const [expandedNewTrack, setExpandedNewTrack] = useState<number | null>(null);

  // Fetch full track data including audio URLs and preview settings
  useEffect(() => {
    const fetchTracksData = async () => {
      if (!album.id) return;
      
      try {
        const { data, error } = await supabase
          .from('audio_products')
          .select('id, title, artist_name, audio_file_url, preview_start_time')
          .eq('album_id', album.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Load audio durations for each track
        const tracksWithDuration = await Promise.all(
          (data || []).map(async (track) => {
            return new Promise<TrackData>((resolve) => {
              const audio = new Audio();
              audio.src = track.audio_file_url;
              audio.onloadedmetadata = () => {
                resolve({
                  ...track,
                  preview_start_time: track.preview_start_time || 0,
                  audioDuration: audio.duration
                });
              };
              audio.onerror = () => {
                resolve({
                  ...track,
                  preview_start_time: track.preview_start_time || 0,
                  audioDuration: 0
                });
              };
            });
          })
        );

        setTracksData(tracksWithDuration);
      } catch (error) {
        console.error('Error fetching tracks:', error);
      } finally {
        setLoadingTracks(false);
      }
    };

    fetchTracksData();
  }, [album.id]);

  const updateTrackPreview = (trackId: string, previewStartTime: number) => {
    setTracksData(prev => 
      prev.map(t => t.id === trackId ? { ...t, preview_start_time: previewStartTime } : t)
    );
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

  // New track management functions
  const addNewTrack = () => {
    setNewTracks(prev => [...prev, {
      audioFile: null,
      title: '',
      featuringArtistName: '',
      featuringArtistPaypal: '',
      featuringPercentage: 0,
      previewStartTime: 0,
      audioDuration: 0,
      audioPreviewUrl: ''
    }]);
  };

  const removeNewTrack = (index: number) => {
    setNewTracks(prev => {
      const updated = [...prev];
      // Revoke object URL to prevent memory leak
      if (updated[index].audioPreviewUrl) {
        URL.revokeObjectURL(updated[index].audioPreviewUrl);
      }
      updated.splice(index, 1);
      return updated;
    });
    if (expandedNewTrack === index) {
      setExpandedNewTrack(null);
    }
  };

  const updateNewTrack = (index: number, field: keyof NewTrackData, value: any) => {
    setNewTracks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleNewTrackAudioChange = async (index: number, file: File | null) => {
    if (!file) return;
    
    // Get audio duration
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    
    audio.onloadedmetadata = () => {
      setNewTracks(prev => {
        const updated = [...prev];
        // Revoke old URL if exists
        if (updated[index].audioPreviewUrl) {
          URL.revokeObjectURL(updated[index].audioPreviewUrl);
        }
        updated[index] = {
          ...updated[index],
          audioFile: file,
          audioDuration: audio.duration,
          audioPreviewUrl: audioUrl,
          title: updated[index].title || file.name.replace(/\.[^/.]+$/, '')
        };
        return updated;
      });
    };
  };

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean = false) => {
    e.preventDefault();
    if (!user || isPublished) return;
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter an album name",
        variant: "destructive"
      });
      return;
    }

    if (formData.accessLevel === 'paid' && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid price for paid content",
        variant: "destructive"
      });
      return;
    }

    // Validate new tracks
    for (let i = 0; i < newTracks.length; i++) {
      const track = newTracks[i];
      if (!track.audioFile) {
        toast({
          title: "Error",
          description: `Please select an audio file for new track ${i + 1}`,
          variant: "destructive"
        });
        return;
      }
      if (!track.title.trim()) {
        toast({
          title: "Error",
          description: `Please enter a title for new track ${i + 1}`,
          variant: "destructive"
        });
        return;
      }
      if (track.featuringArtistName && !track.featuringArtistPaypal) {
        toast({
          title: "Error",
          description: `Please enter PayPal email for featuring artist on track ${i + 1}`,
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);
    
    try {
      let thumbnailUrl = album.thumbnail_url;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(
          formData.thumbnail, 
          'thumbnails', 
          `${user.id}/`
        );
      }

      // Update the album
      const albumUpdateData: any = {
        name: formData.name,
        thumbnail_url: thumbnailUrl,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        is_adult_content: isAdultContent,
        preview_track_id: selectedPreviewTrackId || (tracksData.length > 0 ? tracksData[0].id : null),
      };

      if (shouldPublish) {
        albumUpdateData.status = 'published';
        albumUpdateData.published_at = new Date().toISOString();
      }

      const { error: albumError } = await supabase
        .from('albums')
        .update(albumUpdateData)
        .eq('id', album.id);
      
      if (albumError) throw albumError;

      // Update each track's preview settings individually
      for (const track of tracksData) {
        const { error: trackError } = await supabase
          .from('audio_products')
          .update({
            thumbnail_url: thumbnailUrl,
            is_adult_content: isAdultContent,
            status: shouldPublish ? 'published' : album.status,
            published_at: shouldPublish ? new Date().toISOString() : null,
            preview_start_time: track.preview_start_time,
            preview_duration: 30
          })
          .eq('id', track.id);

        if (trackError) throw trackError;
      }

      // Upload and create new tracks
      const currentTrackCount = tracksData.length;
      for (let i = 0; i < newTracks.length; i++) {
        const newTrack = newTracks[i];
        if (!newTrack.audioFile) continue;

        // Upload audio file
        const audioUrl = await uploadFile(
          newTrack.audioFile,
          'audio-files',
          `${user.id}/`
        );

        // Create audio product
        const { data: audioProduct, error: audioError } = await supabase
          .from('audio_products')
          .insert({
            merchant_id: user.id,
            title: newTrack.title,
            audio_file_url: audioUrl,
            audio_type: 'music',
            status: shouldPublish ? 'published' : album.status,
            published_at: shouldPublish ? new Date().toISOString() : null,
            thumbnail_url: thumbnailUrl,
            is_adult_content: isAdultContent,
            album_id: album.id,
            preview_start_time: newTrack.previewStartTime,
            preview_duration: 30,
            featuring_artist_name: newTrack.featuringArtistName || null,
            featuring_artist_paypal: newTrack.featuringArtistPaypal || null,
            featuring_percentage: newTrack.featuringPercentage || null
          })
          .select()
          .single();

        if (audioError) throw audioError;

        // Create album track entry
        const { error: albumTrackError } = await supabase
          .from('album_tracks')
          .insert({
            album_id: album.id,
            audio_product_id: audioProduct.id,
            track_number: currentTrackCount + i + 1,
            featuring_artist_name: newTrack.featuringArtistName || null,
            featuring_artist_paypal: newTrack.featuringArtistPaypal || null,
            featuring_percentage: newTrack.featuringPercentage || null
          });

        if (albumTrackError) throw albumTrackError;
      }
      
      toast({
        title: "Success",
        description: shouldPublish ? "Album published successfully!" : "Album updated successfully!"
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Error updating album:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update album",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Album</DialogTitle>
        </DialogHeader>

        {isPublished && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This album is published and cannot be edited. Contact administration if you need to make changes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Album Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isPublished}
            />
          </div>

          <div className="space-y-2">
            <Label>Album Cover</Label>
            {album.thumbnail_url && (
              <div className="mb-2 p-2 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Current cover:</p>
                <img 
                  src={album.thumbnail_url} 
                  alt="Current cover" 
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isPublished}
                className="flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                Replace Album Cover
              </Button>
              {formData.thumbnail && (
                <span className="text-sm text-muted-foreground">
                  Selected: {formData.thumbnail.name}
                </span>
              )}
            </div>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files?.[0] || null })}
              className="hidden"
            />
          </div>

          {/* Album Preview Track Selection */}
          <div className="space-y-2">
            <Label>Album Card Preview Track *</Label>
            <p className="text-xs text-muted-foreground">
              Select which track's preview will play on the album card in the store
            </p>
            {loadingTracks ? (
              <p className="text-sm text-muted-foreground">Loading tracks...</p>
            ) : (
              <RadioGroup
                value={selectedPreviewTrackId || (tracksData[0]?.id || '')}
                onValueChange={setSelectedPreviewTrackId}
                disabled={isPublished}
                className="space-y-1"
              >
                {tracksData.map((track, index) => (
                  <div key={track.id} className="flex items-center space-x-2 p-2 rounded hover:bg-secondary/50">
                    <RadioGroupItem value={track.id} id={`preview-${track.id}`} disabled={isPublished} />
                    <Label htmlFor={`preview-${track.id}`} className="flex items-center gap-2 cursor-pointer">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{track.title}</span>
                      {track.artist_name && (
                        <span className="text-muted-foreground text-sm">- {track.artist_name}</span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Track Preview Settings */}
          <div className="space-y-2">
            <Label>Track 30-Second Previews</Label>
            {loadingTracks ? (
              <p className="text-sm text-muted-foreground">Loading tracks...</p>
            ) : (
              <div className="space-y-2">
                {tracksData.map((track, index) => (
                  <div key={track.id} className="border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                      className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-secondary/80 transition-colors"
                      disabled={isPublished}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span className="font-medium">{track.title}</span>
                        {track.artist_name && (
                          <span className="text-muted-foreground">- {track.artist_name}</span>
                        )}
                      </div>
                      {!isPublished && (
                        expandedTrack === track.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </button>
                    
                    {expandedTrack === track.id && !isPublished && track.audioDuration > 0 && (
                      <div className="p-4 bg-blue-900/10 border-t border-border space-y-3">
                        <Label className="text-sm">30-Second Preview Selection</Label>
                        <p className="text-xs text-muted-foreground">
                          Choose which 30 seconds to use as a preview for this track
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Preview: {Math.floor(track.preview_start_time / 60)}:{Math.floor(track.preview_start_time % 60).toString().padStart(2, '0')}</span>
                            <span>to {Math.floor((track.preview_start_time + 30) / 60)}:{Math.floor((track.preview_start_time + 30) % 60).toString().padStart(2, '0')}</span>
                          </div>
                          
                          <Slider
                            value={[track.preview_start_time]}
                            onValueChange={(value) => updateTrackPreview(track.id, value[0])}
                            max={Math.max(0, track.audioDuration - 30)}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0:00</span>
                            <span>{Math.floor(track.audioDuration / 60)}:{Math.floor(track.audioDuration % 60).toString().padStart(2, '0')}</span>
                          </div>

                          <AudioPreviewPlayer
                            audioUrl={track.audio_file_url}
                            previewStartTime={track.preview_start_time}
                            previewDuration={30}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isPublished && (
              <p className="text-xs text-muted-foreground">
                Click on a track to expand and set its 30-second preview.
              </p>
            )}
          </div>

          {/* Add New Tracks Section */}
          {!isPublished && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Add New Tracks</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewTrack}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Track
                </Button>
              </div>

              {newTracks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No new tracks added. Click "Add Track" to add more songs to this album.
                </p>
              ) : (
                <div className="space-y-3">
                  {newTracks.map((track, index) => (
                    <div key={index} className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-secondary">
                        <button
                          type="button"
                          onClick={() => setExpandedNewTrack(expandedNewTrack === index ? null : index)}
                          className="flex items-center gap-2 text-sm flex-1 text-left"
                        >
                          <Upload className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">Track {tracksData.length + index + 1} (New)</span>
                          <span className="font-medium">{track.title || 'Untitled'}</span>
                          {expandedNewTrack === index ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewTrack(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {expandedNewTrack === index && (
                        <div className="p-4 space-y-4 bg-primary/5">
                          {/* Audio File */}
                          <div className="space-y-2">
                            <Label>Audio File *</Label>
                            <Input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleNewTrackAudioChange(index, e.target.files?.[0] || null)}
                            />
                            {track.audioFile && (
                              <p className="text-xs text-muted-foreground">
                                Duration: {Math.floor(track.audioDuration / 60)}:{Math.floor(track.audioDuration % 60).toString().padStart(2, '0')}
                              </p>
                            )}
                          </div>

                          {/* Track Title */}
                          <div className="space-y-2">
                            <Label>Track Title *</Label>
                            <Input
                              value={track.title}
                              onChange={(e) => updateNewTrack(index, 'title', e.target.value)}
                              placeholder="Enter track title"
                            />
                          </div>

                          {/* 30-Second Preview */}
                          {track.audioDuration > 0 && (
                            <div className="space-y-2">
                              <Label>30-Second Preview Selection</Label>
                              <div className="flex justify-between text-sm">
                                <span>Preview: {Math.floor(track.previewStartTime / 60)}:{Math.floor(track.previewStartTime % 60).toString().padStart(2, '0')}</span>
                                <span>to {Math.floor((track.previewStartTime + 30) / 60)}:{Math.floor((track.previewStartTime + 30) % 60).toString().padStart(2, '0')}</span>
                              </div>
                              <Slider
                                value={[track.previewStartTime]}
                                onValueChange={(value) => updateNewTrack(index, 'previewStartTime', value[0])}
                                max={Math.max(0, track.audioDuration - 30)}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0:00</span>
                                <span>{Math.floor(track.audioDuration / 60)}:{Math.floor(track.audioDuration % 60).toString().padStart(2, '0')}</span>
                              </div>
                              {track.audioPreviewUrl && (
                                <AudioPreviewPlayer
                                  audioUrl={track.audioPreviewUrl}
                                  previewStartTime={track.previewStartTime}
                                  previewDuration={30}
                                  className="mt-2"
                                />
                              )}
                            </div>
                          )}

                          {/* Featuring Artist */}
                          <div className="space-y-2">
                            <Label>Featuring Artist (Optional)</Label>
                            <Input
                              value={track.featuringArtistName}
                              onChange={(e) => updateNewTrack(index, 'featuringArtistName', e.target.value)}
                              placeholder="Artist name"
                            />
                          </div>

                          {track.featuringArtistName && (
                            <>
                              <div className="space-y-2">
                                <Label>Featuring Artist PayPal Email *</Label>
                                <Input
                                  type="email"
                                  value={track.featuringArtistPaypal}
                                  onChange={(e) => updateNewTrack(index, 'featuringArtistPaypal', e.target.value)}
                                  placeholder="paypal@email.com"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Featuring Artist Percentage (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={track.featuringPercentage}
                                  onChange={(e) => updateNewTrack(index, 'featuringPercentage', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Access Level *</Label>
            <RadioGroup
              value={formData.accessLevel}
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value as any })}
              disabled={isPublished}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" disabled={isPublished} />
                <Label htmlFor="public">Free for Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" disabled={isPublished} />
                <Label htmlFor="paid">Paid Content</Label>
              </div>
            </RadioGroup>
          </div>
          
          {formData.accessLevel === 'paid' && (
            <div className="space-y-2">
              <Label htmlFor="price">Album Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                disabled={isPublished}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAdultContent"
              checked={isAdultContent}
              onCheckedChange={(checked) => setIsAdultContent(checked as boolean)}
              disabled={isPublished}
            />
            <Label htmlFor="isAdultContent">Adult Content</Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {isPublished ? "Close" : "Cancel"}
            </Button>
            {!isPublished && (
              <>
                <Button 
                  type="button" 
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Save Changes"}
                </Button>
                {album.status === 'draft' && (
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      if (window.confirm("⚠️ Once published, you cannot edit or delete this album. You'll need to contact administration to remove it. Are you sure you want to publish?")) {
                        handleSubmit(e, true);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Publishing..." : "Publish Album"}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAlbumModal;
