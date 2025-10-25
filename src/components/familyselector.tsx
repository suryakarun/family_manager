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
import { Plus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Family {
  id: string;
  name: string;
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

const FamilySelector = ({ selectedFamilyId, onSelectFamily }: FamilySelectorProps) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchFamilies();
    getCurrentUserId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMembers(selectedFamilyId);
    }
  }, [selectedFamilyId]);

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };
  const fetchMembers = async (familyId: string) => {
    // Use secure RPC that joins profiles -> auth.users to get email without exposing auth table to client
    try {
      const { data, error } = await supabase.rpc('get_family_members_with_email', { fam_id: familyId });
      if (error) {
        console.error('Error fetching members via RPC:', error);
        setMembers([]);
        return;
      }

      // rpc returns rows with columns: family_member_id, profile_id, full_name, email, role
      const mapped = (data || []).map((row: any) => ({
        id: row.family_member_id,
        user_id: row.profile_id,
        role: row.role,
        profiles: {
          full_name: row.full_name,
          email: row.email,
        },
      }));
      setMembers(mapped);
    } catch (err) {
      console.error('Unexpected error fetching members via RPC:', err);
      setMembers([]);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedFamilyId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId)
        .eq("family_id", selectedFamilyId);
      if (error) throw error;
      toast({ title: "Member removed" });
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
      .select("family_id, families(id, name)")
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

      // Create family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert([
          {
            name: newFamilyName,
            admin_user_id: user.id,
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

      {/* Member management section */}
      {selectedFamilyId && (
        <div className="mt-4 border rounded p-3 bg-muted">
          <div className="font-semibold mb-2">Family Members</div>
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span>
                  {member.profiles?.full_name || member.profiles?.email || member.user_id}
                  {member.role === "admin" && <span className="ml-2 text-xs text-primary">(Owner)</span>}
                </span>
                {member.role !== "admin" && member.user_id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={loading}
                  >
                    Remove
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
