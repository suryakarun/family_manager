import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Member = { id: string; name: string; role: "owner"|"admin"|"member"|string };

export default function FamilyOverview({ familyId }: { familyId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [familyName, setFamilyName] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");

  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  useEffect(() => {
    if (!familyId) return;

    const load = async () => {
      const { data: fam } = await supabase.from("families")
        .select("name").eq("id", familyId).single();
      setFamilyName(fam?.name ?? "");

      const { data: fm } = await supabase.from("family_members")
        .select(`user_id, role, profiles:profiles ( id, full_name )`)
        .eq("family_id", familyId);

      setMembers((fm || []).map((r: any) => ({
        id: r.profiles?.id || r.user_id,
        name: r.profiles?.full_name || "User",
        role: r.role || "member",
      })));

      setInviteLink(`${siteUrl}/join-family/${familyId}`);
    };

    load();
  }, [familyId, siteUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: "Copied", description: "Invite link copied." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" });
    }
  };

  const refreshLink = async () => {
    // If you add token rotation later, call your RPC here then rebuild the link
    setInviteLink(`${siteUrl}/join-family/${familyId}?t=${Date.now()}`);
    toast({ title: "Invite refreshed" });
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const sorted = useMemo(() => {
    const rank: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    return [...members].sort((a,b) => (rank[a.role]??9) - (rank[b.role]??9) || a.name.localeCompare(b.name));
  }, [members]);

  return (
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
          <div className="flex items-center gap-2">
            <Input value={inviteLink} readOnly className="truncate" />
            <Button size="sm" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={refreshLink}><RefreshCcw className="h-4 w-4" /></Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Members who join via this link will only see this family.
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Family Members</h3>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sorted.length ? sorted.map(m => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{getInitials(m.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{m.name}</span>
              <Badge variant={m.role === "owner" ? "secondary" : "outline"} className="text-xs">
                {m.role.charAt(0).toUpperCase()+m.role.slice(1)}
              </Badge>
            </div>
          )) : <div className="text-sm text-muted-foreground">No members yet.</div>}
        </div>
      </div>
    </Card>
  );
}
