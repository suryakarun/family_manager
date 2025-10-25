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
  invite_token?: string;
}

interface FamilySelectorProps {
  selectedFamilyId: string | null;
  onSelectFamily: (familyId: string) => void;
}

const FamilySelector = ({ selectedFamilyId, onSelectFamily }: FamilySelectorProps) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFamilies();
  }, []);

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

  return (
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
  );
};

export default FamilySelector;