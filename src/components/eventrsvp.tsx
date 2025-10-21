import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, HelpCircle, Users } from "lucide-react";

interface EventRSVPProps {
  eventId: string;
  familyId: string;
  eventTitle: string;
  eventStartTime: string;
}

interface RSVPStatus {
  user_id: string;
  status: "pending" | "accepted" | "declined";
  user_name: string;
  user_email: string;
  rsvp_at: string | null;
}

const EventRSVP = ({ eventId, familyId, eventTitle, eventStartTime }: EventRSVPProps) => {
  const [currentUserStatus, setCurrentUserStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [allRSVPs, setAllRSVPs] = useState<RSVPStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRSVPs = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Fetch all RSVPs for this event with user details
      const { data: rsvps, error } = await supabase
        .from("event_invites")
        .select(`
          user_id,
          status,
          rsvp_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("event_id", eventId);

      if (error) throw error;

      // Format the data
      const formattedRSVPs: RSVPStatus[] = rsvps?.map((rsvp: any) => ({
        user_id: rsvp.user_id,
        status: rsvp.status,
        rsvp_at: rsvp.rsvp_at,
        user_name: rsvp.profiles?.full_name || "Unknown",
        user_email: rsvp.profiles?.email || "",
      })) || [];

      setAllRSVPs(formattedRSVPs);

      // Find current user's RSVP
      const userRSVP = formattedRSVPs.find(r => r.user_id === userData.user.id);
      setCurrentUserStatus(userRSVP?.status || null);

    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    }
  };

  useEffect(() => {
    fetchRSVPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleRSVP = async (status: "pending" | "accepted" | "declined") => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("No user found");

      // Check if RSVP already exists
      const { data: existing } = await supabase
        .from("event_invites")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userData.user.id)
        .single();

      if (existing) {
        // Update existing RSVP
        const { error } = await supabase
          .from("event_invites")
          .update({
            status,
            rsvp_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from("event_invites")
          .insert({
            event_id: eventId,
            user_id: userData.user.id,
            status,
            rsvp_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setCurrentUserStatus(status);

      const statusLabels = {
        accepted: "Going",
        pending: "Maybe",
        declined: "Not Going",
      };

      toast({
        title: "Response Updated",
        description: `You marked "${statusLabels[status]}" for ${eventTitle}`,
      });

      // Refresh RSVPs
      await fetchRSVPs();

    } catch (error: any) {
      console.error("Error updating response:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const goingCount = allRSVPs.filter(r => r.status === "accepted").length;
  const maybeCount = allRSVPs.filter(r => r.status === "pending").length;
  const notGoingCount = allRSVPs.filter(r => r.status === "declined").length;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Your Response</h3>
        <span className="text-xs text-muted-foreground ml-auto">Who's coming?</span>
      </div>

      {/* Response Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={currentUserStatus === "accepted" ? "default" : "outline"}
          onClick={() => handleRSVP("accepted")}
          disabled={loading}
          className={`flex items-center justify-center gap-2 ${
            currentUserStatus === "accepted"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "hover:bg-green-50 hover:border-green-600 hover:text-green-700"
          }`}
        >
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Going</span>
        </Button>

        <Button
          variant={currentUserStatus === "pending" ? "default" : "outline"}
          onClick={() => handleRSVP("pending")}
          disabled={loading}
          className={`flex items-center justify-center gap-2 ${
            currentUserStatus === "pending"
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "hover:bg-amber-50 hover:border-amber-600 hover:text-amber-700"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Maybe</span>
        </Button>

        <Button
          variant={currentUserStatus === "declined" ? "default" : "outline"}
          onClick={() => handleRSVP("declined")}
          disabled={loading}
          className={`flex items-center justify-center gap-2 ${
            currentUserStatus === "declined"
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "hover:bg-red-50 hover:border-red-600 hover:text-red-700"
          }`}
        >
          <X className="h-4 w-4" />
          <span className="text-sm font-medium">Not Going</span>
        </Button>
      </div>

      {/* Response Summary */}
      {allRSVPs.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-around text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="font-medium">{goingCount}</span>
              <span className="text-muted-foreground">Going</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-600"></div>
              <span className="font-medium">{maybeCount}</span>
              <span className="text-muted-foreground">Maybe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="font-medium">{notGoingCount}</span>
              <span className="text-muted-foreground">Not Going</span>
            </div>
          </div>

          {/* Show who's going */}
          {goingCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Going</p>
              <div className="flex flex-wrap gap-2">
                {allRSVPs
                  .filter(r => r.status === "accepted")
                  .map((rsvp) => (
                    <div
                      key={rsvp.user_id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-green-600 text-white">
                          {getInitials(rsvp.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{rsvp.user_name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Show who's maybe */}
          {maybeCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Maybe</p>
              <div className="flex flex-wrap gap-2">
                {allRSVPs
                  .filter(r => r.status === "pending")
                  .map((rsvp) => (
                    <div
                      key={rsvp.user_id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-amber-600 text-white">
                          {getInitials(rsvp.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{rsvp.user_name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventRSVP;
