// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        // Get the session data from the URL fragment
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          navigate("/"); // Redirect to login if something failed
          return;
        }

        if (data.session) {
          console.log("User signed in successfully:", data.session.user);
          navigate("/dashboard"); // Redirect to your main app page
        } else {
          console.log("No session found, redirecting to sign-in page");
          navigate("/");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        navigate("/");
      }
    };

    handleAuthRedirect();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h2 className="text-xl font-semibold">Finishing Sign-In...</h2>
      <p className="text-gray-500 mt-2">Please wait a moment.</p>
    </div>
  );
}
