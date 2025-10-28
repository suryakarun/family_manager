import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, RefreshCcw, Trash2, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Member = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member" | string;
  membershipId?: string;
};

type MemberWithColor = {
  id: string; // family_members.id
  user_id?: string;
  display_name?: string;
  color?: string;
  avatar_url?: string | null;
};
export default function FamilyOverview({ familyId, members: parentMembers, activeIds: parentActiveIds, onToggleMember }: { familyId: string; members?: MemberWithColor[]; activeIds?: Set<string>; onToggleMember?: (id: string) => void }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [familyName, setFamilyName] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [inviteToken, setInviteToken] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [familyOwnerId, setFamilyOwnerId] = useState<string>("");
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [localActiveIds, setLocalActiveIds] = useState<Set<string>>(new Set());

  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  // Generate a random token
  const generateToken = () => {
    return crypto.randomUUID();
  };

  useEffect(() => {
    if (!familyId) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log("=== AUTH DEBUG ===");
      console.log("Current user ID:", user?.id);
      console.log("Current user email:", user?.email);
      console.log("==================");
      
      setCurrentUserId(user?.id || "");

      const { data: fam, error: famError } = await supabase
        .from("families")
        .select("name, admin_user_id, invite_token")
        .eq("id", familyId)
        .single();
      
      console.log("=== FAMILY DEBUG ===");
      console.log("Family ID:", familyId);
      console.log("Family data:", fam);
      console.log("Family error:", famError);
      console.log("Admin user ID:", fam?.admin_user_id);
      console.log("Invite token from DB:", fam?.invite_token);
      console.log("Is current user admin?", user?.id === fam?.admin_user_id);
      console.log("====================");
      
      setFamilyName(fam?.name ?? "");
      setFamilyOwnerId(fam?.admin_user_id ?? "");
      
      let token = fam?.invite_token;
      
      console.log("=== TOKEN DEBUG ===");
      console.log("Token value:", token);
      console.log("Token is truthy?", !!token);
      
      // If no token exists, generate one
      if (!token) {
        console.log("No token found, generating new one...");
        token = generateToken();
        console.log("New token generated:", token);
        
        const { data: updateData, error: updateError } = await supabase
          .from("families")
          .update({ invite_token: token })
          .eq("id", familyId)
          .select();
        
        console.log("Token update result:", updateData);
        console.log("Token update error:", updateError);
      }
      
      setInviteToken(token);
      const finalLink = `${siteUrl}/join-family/${familyId}/${token}`;
      console.log("Final invite link:", finalLink);
      console.log("===================");
      
      setInviteLink(finalLink);

      // If parent provided members (with colors), use them to populate list
      if (parentMembers && parentMembers.length) {
        setMembers(parentMembers.map((pm) => ({
          id: pm.user_id || pm.id,
          name: pm.display_name || "User",
          role: "member",
          membershipId: pm.id,
        })));
      } else {
        const { data: fm } = await supabase
          .from("family_members")
          .select(`id, user_id, role, profiles:profiles ( id, full_name )`)
          .eq("family_id", familyId);

        setMembers(
          (fm || []).map((r: any) => ({
            id: r.profiles?.id || r.user_id,
            name: r.profiles?.full_name || "User",
            role: r.role || "member",
            membershipId: r.id,
          }))
        );
      }
    };

    load();
  }, [familyId, siteUrl]);

  const copyLink = async () => {
    try {
      console.log("Copying link:", inviteLink);
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: "Copied", description: "Invite link copied." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link.",
        variant: "destructive",
      });
    }
  };

  const refreshLink = async () => {
    try {
      const newToken = generateToken();
      console.log("Refreshing link with new token:", newToken);
      
      const { error } = await supabase
        .from("families")
        .update({ invite_token: newToken })
        .eq("id", familyId);
      
      if (error) {
        console.error("Error refreshing token:", error);
        throw error;
      }
      
      setInviteToken(newToken);
      setInviteLink(`${siteUrl}/join-family/${familyId}/${newToken}`);
      
      toast({ 
        title: "Invite link refreshed",
        description: "Old invite links will no longer work."
      });
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Error",
        description: "Failed to refresh invite link.",
        variant: "destructive",
      });
    }
  };

  // Short display for mobile chip
  const shortUrl = (url: string) => {
    try {
      const u = new URL(url);
      const path = `${u.hostname}${u.pathname}`.replace(/^www\./, "");
      return path.length > 36 ? path.slice(0, 33) + "…" : path;
    } catch {
      return url.length > 36 ? url.slice(0, 33) + "…" : url;
    }
  };

  const shareInvite = async () => {
    const text = `Join our family on Family Calendar:\n${inviteLink}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Family Calendar Invite",
          text,
          url: inviteLink,
        });
        return;
      }
    } catch {
      // fall through to WhatsApp
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
  };

  const handleDeleteMember = async () => {
    if (!deletingMember?.membershipId) return;

    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", deletingMember.membershipId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
      toast({
        title: "Member removed",
        description: `${deletingMember.name} has been removed from the family.`,
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingMember(null);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Deterministic color picker (fallback when DB doesn't have a color)
  const palette = ["#f97316","#f43f5e","#8b5cf6","#06b6d4","#10b981","#f59e0b","#3b82f6","#ef4444","#7c3aed","#14b8a6"];
  const pickColorForId = (id: string) => {
    if (!id) return "#3b82f6";
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
    const idx = Math.abs(h) % palette.length;
    return palette[idx];
  };

  const sorted = useMemo(() => {
    const rank: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    return [...members].sort(
      (a, b) =>
        (rank[a.role] ?? 9) - (rank[b.role] ?? 9) ||
        a.name.localeCompare(b.name)
    );
  }, [members]);

  const isOwner = currentUserId === familyOwnerId;

  const activeSet = parentActiveIds ?? localActiveIds;
  const toggleMemberActive = (id: string) => {
    if (onToggleMember) return onToggleMember(id);
    setLocalActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Card className="p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Family Overview</h2>
          <p className="text-sm text-muted-foreground">
            Manage members and share your invite link for this family.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Family</div>
            <div className="text-base font-medium">{familyName || "—"}</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-muted-foreground mb-1">Invite Link</div>

            {/* Desktop: full input */}
            <div className="hidden md:flex items-center gap-2">
              <Input value={inviteLink} readOnly className="truncate" />
              <Button size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={refreshLink}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile: compact layout */}
            <div className="md:hidden space-y-2">
              <div className="px-3 py-2 rounded-md bg-muted text-sm font-medium">
                {shortUrl(inviteLink)}
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex-1" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button className="flex-1" onClick={shareInvite}>
                  <Share2 className="h-4 w-4 mr-2" /> Share via WhatsApp
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={refreshLink}
                  aria-label="Refresh link"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Members who join via this link will only see this family.
            </div>
          </div>
        </div>

        {/* Member colors are shown inline next to each member below (no separate legend) */}

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Family Members</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sorted.length ? (
              sorted.map((m) => {
                const pm = (parentMembers || []).find((p) => p.user_id === m.id || p.id === m.membershipId);
                const color = pm?.color || pickColorForId(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border group"
                  >
                    <span title={`Member color: ${color}`} className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{m.name}</span>
                    <Badge
                      variant={m.role === "owner" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>

                  {/* Owner can remove non-owner members */}
                  {isOwner && m.id !== familyOwnerId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingMember(m)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">No members yet.</div>
            )}
          </div>
        </div>
      </Card>

      {/* Confirm removal */}
      <AlertDialog
        open={!!deletingMember}
        onOpenChange={(open) => !open && setDeletingMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deletingMember?.name}</strong> from this family? They will
              lose access to all family events and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}