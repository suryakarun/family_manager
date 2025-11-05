import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";

interface DashboardHeaderProps {
  session: Session;
  onOpenAI?: () => void;
}

const DashboardHeader = ({ session, onOpenAI }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setAvatarUrl(data.avatar_url);
        setFullName(data.full_name || "");
      }
    };

    fetchProfile();

    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const newData = payload.new as { avatar_url?: string | null; full_name?: string };
            setAvatarUrl(newData.avatar_url ?? null);
            setFullName(newData.full_name || "");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({ title: "Signed out", description: "You have been signed out successfully" });
  };

  const userEmail = session.user.email;
  const userName = fullName || session.user.user_metadata?.full_name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-primary p-2 rounded-lg">
            <span className="text-xl font-bold text-primary-foreground">FC</span>
          </div>
          <span className="font-semibold text-lg">Family Calendar</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* AI Assistant toggle button (optional) */}
          {onOpenAI && (
            <button
              onClick={() => onOpenAI()}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              title="Open AI Assistant"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
