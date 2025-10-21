import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Heart, ThumbsUp, Laugh, PartyPopper, Flame, Eye, X, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Photo {
  id: string;
  file_url: string;
  file_type: "image" | "video";
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string;
  uploader_name: string;
  uploader_avatar: string | null;
  reactions: { [key: string]: number };
  user_reacted: string[];
}

interface EventGalleryProps {
  eventId: string;
  eventTitle: string;
}

const REACTIONS = ["❤️", "👍", "😂", "🎉", "😍", "🔥"];

const EventGallery = ({ eventId, eventTitle }: EventGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [caption, setCaption] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchPhotos();
    getCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setCurrentUserId(data.user.id);
    }
  };

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      // Fetch photos first
      // @ts-ignore - event_photos table exists but types not yet generated
      const { data: photosData, error: photosError } = await supabase
        .from("event_photos")
        .select("*")
        .eq("event_id", eventId)
        .order("uploaded_at", { ascending: false });

      if (photosError) throw photosError;

      // Fetch uploader profiles separately
      const uploaderIds = photosData?.map((p) => p.uploaded_by) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", uploaderIds);

      // Fetch reactions for all photos
      const photoIds = photosData?.map((p) => p.id) || [];
      // @ts-ignore - photo_reactions table exists but types not yet generated
      const { data: reactionsData } = await supabase
        .from("photo_reactions")
        .select("photo_id, reaction, user_id")
        .in("photo_id", photoIds);

      const { data: userData } = await supabase.auth.getUser();

      // Create a map of profiles for quick lookup
      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, p]) || []
      );

      // Format photos with reactions
      const formattedPhotos: Photo[] =
        photosData?.map((photo: any) => {
          const photoReactions = reactionsData?.filter(
            (r) => r.photo_id === photo.id
          ) || [];

          const reactions: { [key: string]: number } = {};
          const userReacted: string[] = [];

          photoReactions.forEach((r) => {
            reactions[r.reaction] = (reactions[r.reaction] || 0) + 1;
            if (r.user_id === userData?.user?.id) {
              userReacted.push(r.reaction);
            }
          });

          const profile = profilesMap.get(photo.uploaded_by);

          return {
            id: photo.id,
            file_url: photo.file_url,
            file_type: photo.file_type,
            caption: photo.caption,
            uploaded_at: photo.uploaded_at,
            uploaded_by: photo.uploaded_by,
            uploader_name: profile?.full_name || "Unknown",
            uploader_avatar: profile?.avatar_url || null,
            reactions,
            user_reacted: userReacted,
          };
        }) || [];

      setPhotos(formattedPhotos);
    } catch (error: any) {
      console.error("Error fetching photos:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: error.message || "Failed to load photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
      const fileType = file.type.startsWith("video") ? "video" : "image";

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("event-photos")
        .getPublicUrl(fileName);

      // Save to database
      // @ts-ignore - event_photos table exists but types not yet generated
      const { error: dbError } = await supabase.from("event_photos").insert({
        event_id: eventId,
        uploaded_by: userData.user.id,
        file_url: urlData.publicUrl,
        file_type: fileType,
        caption: caption || null,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });

      setCaption("");
      setShowUpload(false);
      fetchPhotos();
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (photoId: string, reaction: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to react",
          variant: "destructive",
        });
        return;
      }

      const photo = photos.find((p) => p.id === photoId);
      const hasReacted = photo?.user_reacted.includes(reaction);

      if (hasReacted) {
        // Remove reaction
        // @ts-ignore - photo_reactions table exists but types not yet generated
        const { error } = await supabase
          .from("photo_reactions")
          .delete()
          .eq("photo_id", photoId)
          .eq("user_id", userData.user.id)
          .eq("reaction", reaction);

        if (error) throw error;
      } else {
        // Add reaction
        // @ts-ignore - photo_reactions table exists but types not yet generated
        const { error } = await supabase.from("photo_reactions").insert({
          photo_id: photoId,
          user_id: userData.user.id,
          reaction,
        });

        if (error) throw error;
      }

      // Refresh photos to show updated reactions
      await fetchPhotos();
    } catch (error: any) {
      console.error("Error with reaction:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: error.message || "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;

    try {
      // @ts-ignore - event_photos table exists but types not yet generated
      const { error } = await supabase
        .from("event_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Photo deleted",
      });

      setSelectedPhoto(null);
      fetchPhotos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Photo Gallery</h3>
          <span className="text-sm text-muted-foreground">
            ({photos.length} {photos.length === 1 ? "photo" : "photos"})
          </span>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          size="sm"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Photo
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <Card className="p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="photo-caption">Caption (optional)</Label>
            <Textarea
              id="photo-caption"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Choose Photo/Video</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Supported: JPG, PNG, GIF, WebP, MP4 (max 50MB)
            </p>
          </div>
        </Card>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading photos...
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">No photos yet</p>
          <p className="text-sm text-muted-foreground">
            Be the first to add memories to this event!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-all"
              onClick={() => setSelectedPhoto(photo)}
            >
              {photo.file_type === "image" ? (
                <img
                  src={photo.file_url}
                  alt={photo.caption || "Event photo"}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <video
                  src={photo.file_url}
                  className="w-full h-40 object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="h-8 w-8 text-white" />
              </div>

              {/* Reactions Count */}
              {Object.keys(photo.reactions).length > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-1 bg-black/70 px-2 py-1 rounded-full text-xs">
                  {Object.entries(photo.reactions).map(([emoji, count]) => (
                    <span key={emoji} className="text-white">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Photo by {selectedPhoto.uploader_name}</span>
                {selectedPhoto.uploaded_by === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Photo/Video */}
              {selectedPhoto.file_type === "image" ? (
                <img
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.caption || "Event photo"}
                  className="w-full rounded-lg"
                />
              ) : (
                <video
                  src={selectedPhoto.file_url}
                  controls
                  className="w-full rounded-lg"
                />
              )}

              {/* Uploader Info */}
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedPhoto.uploader_avatar && (
                    <AvatarImage src={selectedPhoto.uploader_avatar} />
                  )}
                  <AvatarFallback>
                    {getInitials(selectedPhoto.uploader_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedPhoto.uploader_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedPhoto.uploaded_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Caption */}
              {selectedPhoto.caption && (
                <p className="text-sm">{selectedPhoto.caption}</p>
              )}

              {/* Reactions */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Reactions</p>
                <div className="flex gap-2 flex-wrap">
                  {REACTIONS.map((reaction) => {
                    const count = selectedPhoto.reactions[reaction] || 0;
                    const hasReacted = selectedPhoto.user_reacted.includes(reaction);

                    return (
                      <Button
                        key={reaction}
                        variant={hasReacted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleReaction(selectedPhoto.id, reaction)}
                        className="gap-1"
                      >
                        <span className="text-lg">{reaction}</span>
                        {count > 0 && <span className="text-xs">{count}</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EventGallery;
