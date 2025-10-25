import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCodeCatcher() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (!code) return;

      const { error } = await supabase.auth.exchangeCodeForSession({ code });
      console.log("Global exchangeCodeForSession error:", error);
      if (error) return; // leave URL as-is so you can read the error in console

      // Clean URL and continue (dashboard or current page)
      window.history.replaceState({}, "", url.origin + pathname);
      navigate("/dashboard", { replace: true });
    })();
  }, [search, pathname, navigate]);

  return null;
}
