import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import DashboardHeader from "@/components/dashboardheader";
import FamilySelector from "@/components/familyselector";
import FamilyCalendar from "@/components/familycalendar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Share2, UserPlus, Calendar as CalIcon, Users, Sparkles, Plane } from "lucide-react";
import { TravelPlanner } from "@/components/TravelPlanner";
import { TravelPlanResults } from "@/components/TravelPlanResults";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [familyStats, setFamilyStats] = useState({ events: 0, members: 0, rsvps: 0 });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [travelPlan, setTravelPlan] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFamilyStats = useCallback(async () => {
    if (!selectedFamilyId) return;

    const [eventsResult, membersResult, rsvpsResult] = await Promise.all([
      supabase.from("events").select("id", { count: "exact" }).eq("family_id", selectedFamilyId).gte("start_time", new Date().toISOString()),
      supabase.from("family_members").select("id", { count: "exact" }).eq("family_id", selectedFamilyId),
      supabase.from("event_invites").select("id", { count: "exact" }).eq("status", "pending")
    ]);

    setFamilyStats({
      events: eventsResult.count || 0,
      members: membersResult.count || 0,
      rsvps: rsvpsResult.count || 0,
    });
  }, [selectedFamilyId]);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchFamilyStats();
    }
  }, [selectedFamilyId, fetchFamilyStats]);

  const generateInviteLink = () => {
    if (!selectedFamilyId) return "";
    // Use production domain instead of window.location.origin
    const baseUrl = import.meta.env.VITE_APP_URL || "https://familycalend.netlify.app/";
    return `${baseUrl}/join-family?id=${selectedFamilyId}`;
  };

  const copyInviteLink = () => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your family members",
    });
  };

  const sendWhatsAppInvite = () => {
    if (!invitePhone.trim()) {
      toast({
        title: "Phone required",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    const link = generateInviteLink("https://familycalend.netlify.app/");
    const message = `Join our family calendar! Click here to get started: ${link}`;
    const whatsappUrl = `https://wa.me/${invitePhone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
    setInviteDialogOpen(false);
    setInvitePhone("");
    
    toast({
      title: "WhatsApp opened",
      description: "Send the invite message to your family member",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <DashboardHeader session={session} />
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 leading-tight truncate">
              Welcome back, {session.user.user_metadata?.full_name || "User"}! <span className="inline-block align-middle">👋</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your family's schedule and stay organized
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FamilySelector selectedFamilyId={selectedFamilyId} onSelectFamily={setSelectedFamilyId} />
            {selectedFamilyId && (
              <Button onClick={() => setInviteDialogOpen(true)} className="gap-1 px-3 py-2 text-sm rounded-md w-auto">
                <UserPlus className="h-4 w-4" />
                <span className="hidden xs:inline">Invite</span>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-2 sm:space-y-6">
          <TabsList className="sticky top-0 z-30 grid w-full max-w-full sm:max-w-2xl grid-cols-3 bg-background/95 backdrop-blur border-b border-border shadow-sm">
            <TabsTrigger value="calendar">
              <CalIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="overview">
              <Sparkles className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="travel">
              <Plane className="h-4 w-4 mr-2" />
              AI Travel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-2 sm:space-y-6 px-0">
            {selectedFamilyId ? (
              <FamilyCalendar familyId={selectedFamilyId} />
            ) : (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Family Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Create or select a family to start managing your calendar
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">{familyStats.events}</CardTitle>
                  <CardDescription>Upcoming Events</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">{familyStats.members}</CardTitle>
                  <CardDescription>Family Members</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">{familyStats.rsvps}</CardTitle>
                  <CardDescription>Pending RSVPs</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Share Your Family Calendar</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={generateInviteLink()} readOnly className="flex-1" />
                  <Button onClick={copyInviteLink} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share via WhatsApp
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this link with family members to invite them to your calendar
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <TravelPlanner 
              onPlanGenerated={(plan, details) => {
                setTravelPlan(plan);
                setEventDetails(details);
              }} 
            />
            {travelPlan && (
              <TravelPlanResults 
                plan={travelPlan} 
                eventDetails={eventDetails}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite via WhatsApp</DialogTitle>
            <DialogDescription>
              Enter the phone number of the person you want to invite
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +91 for India, +1 for USA)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendWhatsAppInvite} className="gap-2">
              <Share2 className="h-4 w-4" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
