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
      
      const currentMember = mapped.find(m => m.user_id === currentUserId);
      setCurrentUserRole(currentMember?.role || null);
    } catch (err) {
      console.error('Unexpected error fetching members via RPC:', err);
      setMembers([]);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedFamilyId) return;
    
    if (!window.confirm("Are you sure you want to remove this member? They will lose access to all family events and calendar.")) {
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId)
        .eq("family_id", selectedFamilyId);
      
      if (error) throw error;
      
      toast({ title: "Member removed successfully" });
      fetchMembers(selectedFamilyId);
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
    if (!newFamilyName.trim()) {
      toast({
        title: "Family name required",
        description: "Please enter a family name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error("No user found");

      const tokenArray = new Uint8Array(16);
      crypto.getRandomValues(tokenArray);
      const inviteToken = Array.from(tokenArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('Creating family:', {
        name: newFamilyName.trim(),
        admin_user_id: user.id,
        invite_token: inviteToken
      });

      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({
          name: newFamilyName.trim(),
          admin_user_id: user.id,
          invite_token: inviteToken,
        })
        .select()
        .single();

      if (familyError) {
        console.error('Family creation error:', familyError);
        throw new Error(familyError.message || 'Failed to create family');
      }

      if (!family) {
        throw new Error('Family created but no data returned');
      }

      console.log('Family created successfully:', family);

      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_id: family.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw new Error(memberError.message || 'Failed to add family member');
      }

      toast({
        title: "Family created!",
        description: `${newFamilyName} has been created successfully`,
      });

      setNewFamilyName("");
      setIsDialogOpen(false);
      await fetchFamilies();
      onSelectFamily(family.id);
    } catch (error: any) {
      console.error('Full error object:', error);
      
      let errorMessage = 'Failed to create family';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      }
      
      toast({
        title: "Error creating family",
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
    
    if (!window.confirm("Are you sure? This will invalidate the current invite link and create a new one.")) {
      return;
    }
    
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
        <Select value={selectedFamilyId || ""} onValueChange={onSelectFamily}>
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
                    onClick={() => handleRemoveMember(member.id)}
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
    </div>
  );
};

export default FamilySelector;