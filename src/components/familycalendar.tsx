import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import MemberLegend from "@/components/MemberLegend";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card } from "@/components/ui/card";
import EventModal from "@/components/eventmodal";
import { useToast } from "@/components/ui/use-toast";
import "./familycalendar.css";

interface FamilyCalendarProps { familyId: string; }
interface ChecklistItem { id: string; text: string; completed: boolean; }
interface ReminderSetting { method: string; time_offset_minutes: number; }

type EventExtendedProps = {
  description?: string;
  location?: string;
  notes?: string;
  checklist?: ChecklistItem[];
  reminder_settings?: ReminderSetting[];
  rsvp_going?: number;
  rsvp_maybe?: number;
  rsvp_not_going?: number;
  creator_avatar_url?: string;
  creator_name?: string;
  creator_member_id?: string;
  creator_color?: string;
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: Required<Pick<EventExtendedProps,
    "description"|"location"|"notes"|"checklist"|"reminder_settings"
  >> & Partial<EventExtendedProps>;
}

const FamilyCalendar = ({ familyId }: FamilyCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; user_id: string; display_name: string; color: string; avatar_url?: string | null }>>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string; title: string; start: Date; end: Date; description: string;
    location: string; color: string; notes: string;
    checklist: ChecklistItem[]; reminder_settings: ReminderSetting[];
  }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { toast } = useToast();

  // Expand RRULE into instances (simple)
  const expandRecurringEvent = (
    event: { id: string; title: string; start_time: string; end_time: string; color?: string|null; description?: string|null; location?: string|null; recurrence_rule?: string|null },
    startDate: Date, endDate: Date
  ): CalendarEvent[] => {
    if (!event.recurrence_rule) return [];
    const instances: CalendarEvent[] = [];
    const rrule = event.recurrence_rule;
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const duration = eventEnd.getTime() - eventStart.getTime();

    const freqMatch = rrule.match(/FREQ=(\w+)/);
    const untilMatch = rrule.match(/UNTIL=(\d{8})/);
    if (!freqMatch) return [];

    const freq = freqMatch[1];
    const until = untilMatch
      ? new Date(
          parseInt(untilMatch[1].slice(0, 4)),
          parseInt(untilMatch[1].slice(4, 6)) - 1,
          parseInt(untilMatch[1].slice(6, 8))
        )
      : new Date(endDate.getTime() + 365*24*60*60*1000);

    const d = new Date(eventStart);
    let count = 0;
    const MAX = 100;

    while (d <= until && d <= endDate && count < MAX) {
      if (d >= startDate) {
        const instEnd = new Date(d.getTime() + duration);
        instances.push({
          id: `${event.id}-${d.toISOString()}`,
          title: `🔁 ${event.title}`,
          start: d.toISOString(),
          end: instEnd.toISOString(),
          backgroundColor: event.color || "#3b82f6",
          borderColor: event.color || "#3b82f6",
          extendedProps: {
            description: event.description || "",
            location: event.location || "",
            notes: "",
            checklist: [],
            reminder_settings: [],
          },
        });
      }
      switch (freq) {
        case "DAILY": d.setDate(d.getDate() + 1); break;
        case "WEEKLY": d.setDate(d.getDate() + 7); break;
        case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
        case "YEARLY": d.setFullYear(d.getFullYear() + 1); break;
      }
      count++;
    }
    return instances;
  };

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase.from("events").select("*").eq("family_id", familyId);
    if (error) { console.error(error); return; }

    const now = new Date();
    const viewStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const viewEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);

    const all: CalendarEvent[] = [];
    type DbEvent = { id: string; title: string; start_time: string; end_time: string; color?: string|null; description?: string|null; location?: string|null; recurrence_rule?: string|null; created_by: string };

    const creatorIds = Array.from(new Set(((data || []) as DbEvent[]).map(e => e.created_by).filter(Boolean)));

    // Fetch family_members for this family to get member colors and member ids
    let userIdToMember = new Map<string, { id: string; color: string; avatar_url?: string | null; display_name: string }>();
    if (creatorIds.length) {
      const { data: famMembers } = await supabase.from("family_members").select("id, user_id, color").eq("family_id", familyId).in("user_id", creatorIds);
      const userIds = (famMembers || []).map((fm: any) => fm.user_id);
      // fetch profiles for display names and avatars
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      // build members array and map
      const membersArr: any[] = (famMembers || []).map((fm: any) => ({
        id: fm.id,
        user_id: fm.user_id,
        color: fm.color || "#3B82F6",
        display_name: profileMap.get(fm.user_id)?.full_name || "",
        avatar_url: profileMap.get(fm.user_id)?.avatar_url || null,
      }));
      membersArr.forEach(m => userIdToMember.set(m.user_id, { id: m.id, color: m.color, avatar_url: m.avatar_url, display_name: m.display_name }));
      setMembers(membersArr);
    }

    const { data: rsvps } = await supabase.from("event_invites").select("event_id, status");
    const counts: Record<string, { going: number; maybe: number; not_going: number }> = {};
    rsvps?.forEach(r => {
      counts[r.event_id] ??= { going: 0, maybe: 0, not_going: 0 };
      if (r.status === "accepted") counts[r.event_id].going++;
      else if (r.status === "pending") counts[r.event_id].maybe++;
      else if (r.status === "declined") counts[r.event_id].not_going++;
    });

    (data as DbEvent[]).forEach(ev => {
      const creator = creators.get(ev.created_by) || null;
      const c = counts[ev.id] || { going: 0, maybe: 0, not_going: 0 };
      if (ev.recurrence_rule) {
        const instances = expandRecurringEvent(ev, viewStart, viewEnd).map(inst => ({
          ...inst,
          extendedProps: {
            ...inst.extendedProps,
            creator_avatar_url: creator?.avatar_url || undefined,
            creator_name: creator?.full_name || undefined,
          },
        }));
        all.push(...instances);
      } else {
        all.push({
          id: ev.id,
          title: ev.title,
          start: ev.start_time,
          end: ev.end_time,
          backgroundColor: ev.color || "#3b82f6",
          borderColor: ev.color || "#3b82f6",
          extendedProps: {
            description: ev.description || "",
            location: ev.location || "",
            notes: "",
            checklist: [],
            reminder_settings: [],
            rsvp_going: c.going,
            rsvp_maybe: c.maybe,
            rsvp_not_going: c.not_going,
            creator_avatar_url: creator?.avatar_url || undefined,
            creator_name: creator?.full_name || undefined,
          },
        });
      }
    });

    setEvents(all);
  }, [familyId]);

  useEffect(() => {
    fetchEvents();
    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `family_id=eq.${familyId}` }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [familyId, fetchEvents]);

  const handleDateClick = (arg: { date: Date }) => { setModalDate(arg.date); setSelectedEvent(undefined); setIsModalOpen(true); };

  const handleEventClick = (clickInfo: { event: any }) => {
    const e = clickInfo.event;
    const ex = e.extendedProps as EventExtendedProps;
    setSelectedEvent({
      id: e.id, title: e.title, start: e.start, end: e.end,
      description: ex.description || "", location: ex.location || "",
      color: e.backgroundColor, notes: ex.notes || "",
      checklist: ex.checklist || [], reminder_settings: ex.reminder_settings || [],
    });
    setModalDate(null); setIsModalOpen(true);
  };

  const handleEventDrop = async (dropInfo: { event: any; revert: () => void }) => {
    const e = dropInfo.event;
    const { error } = await supabase.from("events").update({ start_time: e.start?.toISOString(), end_time: e.end?.toISOString() }).eq("id", e.id);
    if (error) { useToast().toast({ title: "Error", description: "Failed to update event", variant: "destructive" }); dropInfo.revert(); }
    else { useToast().toast({ title: "Event updated", description: "Event has been rescheduled" }); }
  };

  const renderEventContent = (info: { event: any; timeText: string }) => {
    const ex = info.event.extendedProps as EventExtendedProps;
    const rsvpGoing = Number(ex.rsvp_going || 0);
    const rsvpMaybe = Number(ex.rsvp_maybe || 0);
    const total = rsvpGoing + rsvpMaybe;
    const avatarUrl = ex.creator_avatar_url;
    const creatorName = ex.creator_name || "";
    const initials = creatorName ? creatorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "";

    return (
      <div className="fc-event-main-frame flex items-center gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-white/40">
          {avatarUrl ? <img src={avatarUrl} alt={creatorName} className="w-full h-full object-cover" /> :
            <div className="w-full h-full bg-white/30 text-[12px] flex items-center justify-center font-semibold">{initials}</div>}
        </div>
        <div className="min-w-0">
          <div className="fc-event-time">{info.timeText}</div>
          <div className="fc-event-title fc-sticky truncate">
            {info.event.title}
            {total > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-white/20 rounded-full">👥 {total}</span>}
          </div>
        </div>
      </div>
    );
  };

  // filter events based on legend selection
  const displayedEvents = events.filter(ev => {
    const creatorId = (ev.extendedProps as any).creator_member_id as string | undefined;
    if (activeIds.size === 0) return true;
    if (!creatorId) return true;
    return activeIds.has(creatorId);
  });

  const toggleMember = (id: string) => {
    setActiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Card className="p-6 shadow-card">
        <MemberLegend members={members} activeIds={activeIds} onToggle={toggleMember} />
        <FullCalendar
          className="fc-dark-skin"   // ✅ makes dark overrides apply
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          events={displayedEvents}
          editable selectable selectMirror dayMaxEvents weekends
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          height="auto"
        />
      </Card>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEvent(undefined); setModalDate(null); }}
        familyId={familyId}
        event={selectedEvent}
        defaultDate={modalDate}
        onEventSaved={fetchEvents}
      />
    </>
  );
};

export default FamilyCalendar;
