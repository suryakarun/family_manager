// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        // Only handle on the exact callback route
        if (pathname !== "/auth/callback") return;

        // If we already have a session, go forward
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await ensureProfileAndFamily(session.user.id);
          navigate("/dashboard", { replace: true });
          return;
        }

        // Prevent duplicate handling across remounts/navigations
        if (sessionStorage.getItem("__pkce_done") === "1") return;
        sessionStorage.setItem("__pkce_done", "1");

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          // Exchange the PKCE code ONCE
          const { error } = await supabase.auth.exchangeCodeForSession({ code });

          // Strip ?code from the URL immediately, stay on /auth/callback
          window.history.replaceState({}, "", url.origin + "/auth/callback");

          if (error) throw error;

          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (!newSession) throw new Error("No session found after exchange.");

          await ensureProfileAndFamily(newSession.user.id);
          navigate("/dashboard", { replace: true });
          return;
        }

        // No code -> back to /auth
        navigate("/auth", { replace: true });
      } catch (err: any) {
        console.error("Auth callback error:", err);
        sessionStorage.removeItem("__pkce_done"); // allow retry if something failed
        toast({
          title: "Authentication Error",
          description: err?.message ?? "Failed to complete sign in.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    })();
  }, [pathname, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}

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
