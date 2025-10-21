import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card } from "@/components/ui/card";
import EventModal from "@/components/eventmodal";
import { useToast } from "@/components/ui/use-toast";
import "./FamilyCalendar.css";

interface FamilyCalendarProps {
  familyId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    description: string;
    location: string;
    notes: string;
    checklist: ChecklistItem[];
    reminder_settings: ReminderSetting[];
    rsvp_going?: number;
    rsvp_maybe?: number;
    rsvp_not_going?: number;
    creator_avatar_url?: string;
    creator_name?: string;
  };
}

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
};

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ReminderSetting {
  method: string;
  time_offset_minutes: number;
}

const FamilyCalendar = ({ familyId }: FamilyCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    description: string;
    location: string;
    color: string;
    notes: string;
    checklist: ChecklistItem[];
    reminder_settings: ReminderSetting[];
  } | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { toast } = useToast();

  // Helper function to parse RRULE and generate recurring instances
  const expandRecurringEvent = (event: { id: string; title: string; start_time: string; end_time: string; color?: string | null; description?: string | null; location?: string | null; recurrence_rule?: string | null }, startDate: Date, endDate: Date): CalendarEvent[] => {
    if (!event.recurrence_rule) return [];
    
    const instances: CalendarEvent[] = [];
    const rrule = event.recurrence_rule;
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const eventDuration = eventEnd.getTime() - eventStart.getTime();
    
    // Parse RRULE
    const freqMatch = rrule.match(/FREQ=(\w+)/);
    const untilMatch = rrule.match(/UNTIL=(\d{8})/);
    
    if (!freqMatch) return [];
    
    const freq = freqMatch[1];
    const until = untilMatch ? new Date(
      parseInt(untilMatch[1].substring(0, 4)),
      parseInt(untilMatch[1].substring(4, 6)) - 1,
      parseInt(untilMatch[1].substring(6, 8))
    ) : new Date(endDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year ahead
    
    const firstDate = new Date(eventStart);
    let count = 0;
    const maxInstances = 100; // Safety limit
    
    while (firstDate <= until && firstDate <= endDate && count < maxInstances) {
      if (firstDate >= startDate) {
        const instanceEnd = new Date(firstDate.getTime() + eventDuration);
        instances.push({
          id: `${event.id}-${firstDate.toISOString()}`, // Unique ID for each instance
          title: `🔁 ${event.title}`,
          start: firstDate.toISOString(),
          end: instanceEnd.toISOString(),
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
      
      // Increment based on frequency
      switch (freq) {
        case 'DAILY':
          firstDate.setDate(firstDate.getDate() + 1);
          break;
        case 'WEEKLY':
          firstDate.setDate(firstDate.getDate() + 7);
          break;
        case 'MONTHLY':
          firstDate.setMonth(firstDate.getMonth() + 1);
          break;
        case 'YEARLY':
          firstDate.setFullYear(firstDate.getFullYear() + 1);
          break;
      }
      count++;
    }
    
    return instances;
  };

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("family_id", familyId);

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    // Get calendar view date range (approximate - 3 months before and after current date)
    const now = new Date();
    const viewStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const viewEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    
    const allEvents: CalendarEvent[] = [];

    // Fetch creator profiles to display avatar on events
    type DbEvent = { id: string; title: string; start_time: string; end_time: string; color?: string | null; description?: string | null; location?: string | null; recurrence_rule?: string | null; created_by: string };
    const creatorIds = Array.from(
      new Set(((data || []) as DbEvent[]).map((e) => e.created_by).filter(Boolean))
    );
    let creatorsMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", creatorIds);
      type ProfileLite = { id: string; full_name: string; avatar_url: string | null };
      creatorsMap = new Map(
        ((creators || []) as ProfileLite[]).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );
    }
    
    // Fetch RSVP counts for all events
    const { data: rsvpData } = await supabase
      .from("event_invites")
      .select("event_id, status");

    // Count RSVPs by event
    const rsvpCounts: Record<string, { going: number; maybe: number; not_going: number }> = {};
    rsvpData?.forEach((rsvp) => {
      if (!rsvpCounts[rsvp.event_id]) {
        rsvpCounts[rsvp.event_id] = { going: 0, maybe: 0, not_going: 0 };
      }
      if (rsvp.status === "accepted") rsvpCounts[rsvp.event_id].going++;
      else if (rsvp.status === "pending") rsvpCounts[rsvp.event_id].maybe++;
      else if (rsvp.status === "declined") rsvpCounts[rsvp.event_id].not_going++;
    });
    
  (data as DbEvent[]).forEach((event) => {
      const creator = creatorsMap.get(event.created_by) || null;
      const rsvps = rsvpCounts[event.id] || { going: 0, maybe: 0, not_going: 0 };
      
      if (event.recurrence_rule) {
        // Expand recurring events
        const instances = expandRecurringEvent(event, viewStart, viewEnd);
        // Attach creator details to each instance
        allEvents.push(
          ...instances.map((inst) => ({
            ...inst,
            extendedProps: {
              ...inst.extendedProps,
              creator_avatar_url: creator?.avatar_url || undefined,
              creator_name: creator?.full_name || undefined,
            },
          }))
        );
      } else {
        // Regular one-time event
        allEvents.push({
          id: event.id,
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          backgroundColor: event.color || "#3b82f6",
          borderColor: event.color || "#3b82f6",
          extendedProps: {
            description: event.description || "",
            location: event.location || "",
            notes: "",
            checklist: [],
            reminder_settings: [],
            rsvp_going: rsvps.going,
            rsvp_maybe: rsvps.maybe,
            rsvp_not_going: rsvps.not_going,
            creator_avatar_url: creator?.avatar_url || undefined,
            creator_name: creator?.full_name || undefined,
          },
        });
      }
    });

    setEvents(allEvents);
  }, [familyId]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, fetchEvents]);

  const handleDateClick = (arg: { date: Date }) => {
    setModalDate(arg.date);
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  type FCEventObj = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    backgroundColor: string;
    extendedProps: Record<string, unknown>;
  };
  const handleEventClick = (clickInfo: { event: FCEventObj }) => {
    const event = clickInfo.event;
    console.log("handleEventClick: Clicked event raw data:", event);
    const ex = event.extendedProps as EventExtendedProps;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      description: ex.description || "",
      location: ex.location || "",
      color: event.backgroundColor,
      notes: ex.notes || "",
      checklist: ex.checklist || [],
      // --- NEW: Pass reminder_settings ---
      reminder_settings: ex.reminder_settings || [],
      // --- END NEW ---
    });

    setModalDate(null);
    setIsModalOpen(true);
  };

  const handleEventDrop = async (dropInfo: { event: { id: string; start?: Date; end?: Date }; revert: () => void }) => {
    const event = dropInfo.event;
    const { error } = await supabase
      .from("events")
      .update({
        start_time: event.start?.toISOString(),
        end_time: event.end?.toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      dropInfo.revert();
    } else {
      toast({
        title: "Event updated",
        description: "Event has been rescheduled",
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(undefined);
    setModalDate(null);
  };

  // Custom event content renderer to show RSVP counts
  const renderEventContent = (eventInfo: { event: { title: string; extendedProps: EventExtendedProps }; timeText: string }) => {
    const rsvpGoing = Number(eventInfo.event.extendedProps.rsvp_going || 0);
    const rsvpMaybe = Number(eventInfo.event.extendedProps.rsvp_maybe || 0);
    const totalRSVP = rsvpGoing + rsvpMaybe;
    const avatarUrl = eventInfo.event.extendedProps.creator_avatar_url;
    const creatorName = eventInfo.event.extendedProps.creator_name || "";
    const initials = creatorName
      ? creatorName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "";

    return (
      <div className="fc-event-main-frame flex items-center gap-3">
        {/* Creator avatar */}
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-white/40">
          {avatarUrl ? (
            <img src={avatarUrl} alt={creatorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/30 text-[12px] flex items-center justify-center font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="fc-event-time">{eventInfo.timeText}</div>
          <div className="fc-event-title fc-sticky truncate">
            {eventInfo.event.title}
            {totalRSVP > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                👥 {totalRSVP}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="p-6 shadow-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          height="auto"
        />
      </Card>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        familyId={familyId}
        event={selectedEvent}
        defaultDate={modalDate}
        onEventSaved={fetchEvents}
      />
    </>
  );
};

export default FamilyCalendar;