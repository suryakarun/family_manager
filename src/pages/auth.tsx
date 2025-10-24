import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Users, Sparkles } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('Auth component mounted, checking session...');
    // Check if user is already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      if (session) {
        console.log('Session found, navigating to dashboard');
        navigate("/dashboard");
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (session) {
        console.log('New session detected, navigating to dashboard');
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // OAuth sign-in handlers
  const handleOAuthSignIn = async (provider: "google" | "facebook") => {
    setLoading(true);
    try {
      console.log('Starting OAuth sign in with:', provider);
      console.log('Redirect URL will be:', `${window.location.origin}/dashboard`);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://familycalend.netlify.app/auth/callback',
        },
      });
      console.log('OAuth response:', { data, error });
      if (error) throw error;
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      console.error('OAuth error:', err);
      toast({
        title: "Error",
        description: err?.message || `Sign in with ${provider} failed`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with phone
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            phone: phone,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // Create a family for the new user
        const { data: familyData, error: familyError } = await supabase
          .from("families")
          .insert({
            name: `${fullName}'s Family`,
            admin_user_id: data.user.id,
          })
          .select()
          .single();

        if (familyError) {
          console.error("Family creation error:", familyError);
        } else if (familyData) {
          // Add user as family member
          await supabase.from("family_members").insert({
            family_id: familyData.id,
            user_id: data.user.id,
            role: "admin",
            status: "active",
          });
        }
      }

      toast({
        title: "Success!",
        description: "Account created! Please check your email to confirm.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      toast({
        title: "Error",
        description: err?.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      toast({
        title: "Error",
        description: err?.message || "Sign in failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="hidden lg:block space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Family Smart Calendar
            </h1>
            <p className="text-xl text-muted-foreground">
              Keep your family organized, connected, and happy with
              AI-powered scheduling
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered conflict detection and time suggestions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-accent/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Family Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Share calendars, RSVPs, and to-dos with your family
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-success/10 p-3 rounded-lg">
                <Sparkles className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  WhatsApp Integration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send reminders and parse invites automatically
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="shadow-elegant border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
                <div className="my-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn("google")}
                    disabled={loading}
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      className="h-5 w-5"
                    />
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn("facebook")}
                    disabled={loading}
                  >
                    <img
                      src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                      alt="Facebook"
                      className="h-5 w-5"
                    />
                    Continue with Facebook
                  </Button>
                </div>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">
                      WhatsApp Phone Number
                    </Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +91 for India)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
                <div className="my-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn("google")}
                    disabled={loading}
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      className="h-5 w-5"
                    />
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn("facebook")}
                    disabled={loading}
                  >
                    <img
                      src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                      alt="Facebook"
                      className="h-5 w-5"
                    />
                    Continue with Facebook
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
