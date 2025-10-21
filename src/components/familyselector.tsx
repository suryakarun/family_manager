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
      .select("family_id, families(id, name)")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error("Error fetching families:", error);
      return;
    }

    const familiesData =
      familyMembers
        ?.map((fm: any) => fm.families)
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
};

export default FamilySelector;
