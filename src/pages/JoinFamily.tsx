import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Users, CheckCircle, XCircle } from "lucide-react";

const JoinFamily = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    setFamilyId(id);
    fetchFamilyDetails(id);
  }, [searchParams]);

  const fetchFamilyDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("name")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Family not found");
      } else {
        setFamilyName(data.name);
      }
    } catch (err) {
      setError("Failed to load family details");
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", familyId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast({
          title: "Already a member",
          description: "You're already part of this family",
        });
        navigate("/dashboard");
        return;
      }

      // Add as family member
      const { error } = await supabase.from("family_members").insert({
        family_id: familyId,
        user_id: user.id,
        role: "member",
        status: "active",
      });

      if (error) throw error;

      setJoined(true);
      toast({
        title: "Success!",
        description: `You've joined ${familyName}`,
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <Card className="w-full max-w-md shadow-elegant">
        {error ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-destructive/10 p-3 rounded-full w-fit">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Invalid Invite</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Go to Sign In
              </Button>
            </CardContent>
          </>
        ) : joined ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-success/10 p-3 rounded-full w-fit">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl">Welcome!</CardTitle>
              <CardDescription>
                You've successfully joined {familyName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Join Family</CardTitle>
              <CardDescription>
                You've been invited to join <strong>{familyName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                By joining, you'll be able to view and manage shared family events
              </p>
              <Button onClick={joinFamily} disabled={loading} className="w-full">
                {loading ? "Joining..." : "Join Family"}
              </Button>
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
                Cancel
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default JoinFamily;