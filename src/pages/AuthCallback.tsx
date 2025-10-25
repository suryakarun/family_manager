import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE flow: exchange code for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
          window.history.replaceState({}, "", url.origin + "/");
        } else {
          // fallback: hash tokens (rare)
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
            window.history.replaceState({}, "", url.origin + "/");
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session found.");

        await ensureProfileAndFamily(session.user.id);
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        console.error("Auth callback error:", err);
        toast({
          title: "Authentication Error",
          description: err?.message ?? "Failed to complete sign in.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    })();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}

export default AuthCallback;

async function ensureProfileAndFamily(userId: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      await supabase.from("profiles").insert({
        id: userId,
        full_name: meta.full_name || meta.name || "User",
        avatar_url: meta.avatar_url ?? null,
      });
    }

    const { data: member } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      const displayName = meta.full_name || meta.name || "User";

      const { data: fam } = await supabase
        .from("families")
        .insert({ name: `${displayName}'s Family`, admin_user_id: userId })
        .select()
        .single();

      if (fam) {
        await supabase.from("family_members").insert({
          family_id: fam.id,
          user_id: userId,
          role: "admin",
          status: "active",
        });
      }
    }
  } catch (e) {
    console.warn("ensureProfileAndFamily:", e);
  }
}
