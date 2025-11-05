import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import DashboardHeader from "@/components/dashboardheader";
import FamilySelector from "@/components/familyselector";
import FamilyCalendar from "@/components/familycalendar";
import FamilyOverview from "@/components/FamilyOverview";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Calendar as CalIcon, Users, Sparkles, Plane } from "lucide-react";
import { TravelPlanner } from "@/components/TravelPlanner";
import { TravelPlanResults } from "@/components/TravelPlanResults";
import { AIAssistant } from '@/components/AIAssistant';

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [familyStats, setFamilyStats] = useState({ events: 0, members: 0, rsvps: 0 });
  const [members, setMembers] = useState<Array<{ id: string; user_id: string; display_name: string; color: string; avatar_url?: string | null }>>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [travelPlan, setTravelPlan] = useState<any>(null);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFamilyStats = useCallback(async () => {
    if (!selectedFamilyId) return;

    const [eventsResult, membersResult, rsvpsResult] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("family_id", selectedFamilyId)
        .gte("start_time", new Date().toISOString()),

      supabase
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("family_id", selectedFamilyId),

      // pending RSVPs for events in THIS family only
      supabase
        .from("event_invites")
        .select("id, events!inner(family_id)", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("events.family_id", selectedFamilyId),
    ]);

    setFamilyStats({
      events: eventsResult.count || 0,
      members: membersResult.count || 0,
      rsvps: rsvpsResult.count || 0,
    });
  }, [selectedFamilyId]);

  const fetchMembers = useCallback(async () => {
    if (!selectedFamilyId) return;
    try {
      const { data: famMembers } = await supabase
        .from("family_members")
        .select("id, user_id, color")
        .eq("family_id", selectedFamilyId);

      const userIds = (famMembers || []).map((fm: any) => fm.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const membersArr = (famMembers || []).map((fm: any) => ({
        id: fm.id,
        user_id: fm.user_id,
        display_name: profileMap.get(fm.user_id)?.full_name || "",
        // do NOT default missing DB colors to a single color here — leave undefined
        // so the UI can apply a deterministic fallback palette per-member
        color: fm.color ?? undefined,
        avatar_url: profileMap.get(fm.user_id)?.avatar_url || null,
      }));

      setMembers(membersArr);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    if (selectedFamilyId) fetchFamilyStats();
    if (selectedFamilyId) fetchMembers();
  }, [selectedFamilyId, fetchFamilyStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <DashboardHeader session={session} onOpenAI={() => setShowAI(true)} />

      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        {/* Top row: welcome + family selector */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 leading-tight truncate">
              Welcome back, {session.user.user_metadata?.full_name || "User"}!{" "}
              <span className="inline-block align-middle">👋</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your family's schedule and stay organized
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FamilySelector selectedFamilyId={selectedFamilyId} onSelectFamily={setSelectedFamilyId} />
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

          {/* Calendar */}
          <TabsContent value="calendar" className="space-y-2 sm:space-y-6 px-0">
            {selectedFamilyId ? (
              <FamilyCalendar familyId={selectedFamilyId} members={members} activeIds={activeIds} onToggleMember={(id: string) => {
                setActiveIds(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }} />
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

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            {selectedFamilyId && (
              <FamilyOverview
                familyId={selectedFamilyId}
                members={members}
                activeIds={activeIds}
                onToggleMember={(id: string) => setActiveIds(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })}
              />
            )}

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
          </TabsContent>

          {/* AI Travel */}
          <TabsContent value="travel" className="space-y-6">
            <TravelPlanner
              onPlanGenerated={(plan, details) => {
                setTravelPlan(plan);
                setEventDetails(details);
              }}
            />
            {travelPlan && <TravelPlanResults plan={travelPlan} eventDetails={eventDetails} />}
          </TabsContent>
        </Tabs>
      </main>
      {/* AI Assistant (floating/modal) */}
      {showAI && selectedFamilyId && session?.user?.id && (
        <AIAssistant
          familyId={selectedFamilyId}
          userId={session.user.id}
          onEventCreated={(event) => {
            // close the assistant and refresh
            setShowAI(false);
            fetchFamilyStats();
          }}
          onConflictDetected={(conflicts) => {
            console.log('AI conflicts', conflicts);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
