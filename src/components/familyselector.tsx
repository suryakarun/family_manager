import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Copy, RefreshCw, Trash2 } from "lucide-react";
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

interface Family {
  id: string;
  name: string;
  invite_token?: string;
}

interface FamilySelectorProps {
  selectedFamilyId: string | null;
  onSelectFamily: (familyId: string) => void;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface GetFamilyMembersRow {
  family_member_id: string;
  user_id: string;
  profile_id: string;
  full_name: string;
  email: string | null;
  role: string;
}

const FamilySelector = ({ selectedFamilyId, onSelectFamily }: FamilySelectorProps) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);
  const [inviteToken, setInviteToken] = useState<string>("");

  useEffect(() => {
    fetchFamilies();
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMembers(selectedFamilyId);
      fetchInviteToken(selectedFamilyId);
    }
  }, [selectedFamilyId]);

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchInviteToken = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("invite_token")
        .eq("id", familyId)
        .single();

      if (error) throw error;
      setInviteToken(data?.invite_token || "");
    } catch (error) {
      console.error("Error fetching invite token:", error);
    }
  };

  const fetchMembers = async (familyId: string) => {
    try {
      const res = await (supabase as any).rpc('get_family_members_with_email', { fam_id: familyId }) as { data: GetFamilyMembersRow[] | null; error: any };
      const { data, error } = res;
      
      if (error) {
        console.error('Error fetching members via RPC:', error);
        setMembers([]);
        return;
      }

      const mapped = (data ?? []).map((row: GetFamilyMembersRow) => ({
        id: row.family_member_id,
        user_id: row.user_id,
        role: row.role,
        profiles: {
          full_name: row.full_name,
          email: row.email ?? undefined,
        },
      }));
      
      setMembers(mapped);
      
      // Set current user's role
      const currentMember = mapped.find(m => m.user_id === currentUserId);
      setCurrentUserRole(currentMember?.role || null);
    } catch (err) {
      console.error('Unexpected error fetching members via RPC:', err);
      setMembers([]);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedFamilyId || !memberToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberToDelete.id)
        .eq("family_id", selectedFamilyId);
      
      if (error) throw error;
      
      toast({ title: "Member removed successfully" });
      fetchMembers(selectedFamilyId);
      setMemberToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilies = async () => {
    const { data: familyMembers, error } = await supabase
      .from("family_members")
      .select("family_id, families(id, name, invite_token)")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error("Error fetching families:", error);
      return;
    }

    interface FamilyMemberRow {
      family_id: string;
      families: Family | null;
    }

    const familiesData =
      (familyMembers as FamilyMemberRow[] | null)
        ?.map((fm) => fm.families)
        .filter((f): f is Family => f !== null) || [];

    setFamilies(familiesData);

    if (familiesData.length > 0 && !selectedFamilyId) {
      onSelectFamily(familiesData[0].id);
    }
  };

  const createFamily = async () => {
    if (!newFamilyName.trim()) return;

    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user found");

      // Generate invite token
      const inviteToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Create family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert([
          {
            name: newFamilyName,
            admin_user_id: user.id,
            invite_token: inviteToken,
          },
        ])
        .select()
        .single();

      if (familyError) throw familyError;

      // Add creator as member
      const { error: memberError } = await supabase.from("family_members").insert([
        {
          family_id: family.id,
          user_id: user.id,
          role: "admin",
        },
      ]);

      if (memberError) throw memberError;

      toast({
        title: "Family created!",
        description: `${newFamilyName} has been created successfully`,
      });

      setNewFamilyName("");
      setIsDialogOpen(false);
      fetchFamilies();
      onSelectFamily(family.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = () => {
    if (!selectedFamilyId || !inviteToken) return "";
    const base = import.meta.env.VITE_APP_URL || "https://familycalend.netlify.app";
    return `${base.replace(/\/$/, "")}/join-family/${selectedFamilyId}/${inviteToken}`;
  };

  const copyInviteLink = () => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "Invite link copied!",
      description: "Share this link to invite members to this family only",
    });
  };

  const regenerateInviteToken = async () => {
    if (!selectedFamilyId || currentUserRole !== "admin") return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('regenerate_family_invite_token', {
        family_id_param: selectedFamilyId
      });

      if (error) throw error;

      setInviteToken(data);
      toast({
        title: "Invite link regenerated!",
        description: "Old invite links will no longer work",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select value={selectedFamilyId || undefined} onValueChange={onSelectFamily}>
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <SelectValue placeholder="Select family" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {families.map((family) => (
              <SelectItem key={family.id} value={family.id}>
                {family.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Family</DialogTitle>
              <DialogDescription>
                Create a new family to organize and share events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="family-name">Family Name</Label>
                <Input
                  id="family-name"
                  placeholder="The Smiths"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createFamily} disabled={loading}>
                {loading ? "Creating..." : "Create Family"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invite link section - only for owners */}
      {selectedFamilyId && currentUserRole === "admin" && inviteToken && (
        <div className="mt-2 border rounded p-3 bg-muted/50">
          <div className="font-semibold mb-2 text-sm">Family Invite Link</div>
          <div className="flex gap-2 mb-2">
            <Input 
              value={generateInviteLink()} 
              readOnly 
              className="text-xs"
            />
            <Button size="sm" variant="outline" onClick={copyInviteLink}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={regenerateInviteToken}
              disabled={loading}
              title="Regenerate link (old links will stop working)"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link is specific to this family only. Members who join will only see this family.
          </p>
        </div>
      )}

      {/* Member management section */}
      {selectedFamilyId && (
        <div className="mt-2 border rounded p-3 bg-muted">
          <div className="font-semibold mb-2">Family Members</div>
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {member.profiles?.full_name || member.profiles?.email || member.user_id}
                  {member.role === "admin" && <span className="ml-2 text-xs text-primary">(Owner)</span>}
                </span>
                {currentUserRole === "admin" && member.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMemberToDelete(member)}
                    disabled={loading}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.profiles?.full_name || "this member"} from the family? 
              They will lose access to all family events and calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilySelector;