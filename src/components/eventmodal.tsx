import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Palette, Trash2, ListChecks, FileText, Bell, Sparkles, Camera } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import EventRSVP from "@/components/eventrsvp";
import EventGallery from "@/components/eventgallery";
import { useAIAssistant } from "@/hooks/use-ai-assistant";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface AISuggestion {
  title: string;
  description: string;
  suggestedTime: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  event?: any;
  defaultDate?: Date | null;
  onEventSaved: () => void;
}

const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
];

// Helper to format a Date object into YYYY-MM-DDTHH:MM for datetime-local input
const formatForDateTimeLocal = (date: Date) => {
  // 'sv-SE' locale is good because it produces 'YYYY-MM-DD HH:MM' consistently
  // We replace the space with 'T' to get the 'YYYY-MM-DDTHH:MM' format
  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Ensure 24-hour format
  }).replace(' ', 'T');
};

// Helper to queue WhatsApp reminders
const queueWhatsAppReminder = async (
  eventId: string,
  eventTitle: string,
  startDateTime: Date,
  offsetMinutes: number,
  userId: string,
  description?: string,
  location?: string,
  notes?: string,
  checklist?: ChecklistItem[]
) => {
  try {
    const sendAt = new Date(startDateTime.getTime() - offsetMinutes * 60 * 1000);
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Build the reminder message with all details
    let message = `🔔 *Event Reminder*\n\n`;
    message += `📌 *${eventTitle}*\n\n`;
    message += `🕐 *Starts:* ${startDateTime.toLocaleString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    })}\n`;
    
    if (location) {
      message += `📍 *Location:* ${location}\n`;
    }
    
    if (description) {
      message += `\n📝 *Description:*\n${description}\n`;
    }
    
    if (notes) {
      message += `\n📋 *Notes:*\n${notes}\n`;
    }
    
    if (checklist && checklist.length > 0) {
      message += `\n✅ *Checklist:*\n`;
      checklist.forEach((item, index) => {
        const checkbox = item.completed ? '☑️' : '⬜';
        message += `${checkbox} ${item.text}\n`;
      });
    }
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/queue-reminder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          user_id: userId,
          message: message,
          send_at: sendAt.toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to queue reminder:', error);
    } else {
      const result = await response.json();
      console.log('WhatsApp reminder queued successfully!', result);
    }
  } catch (error) {
    console.error('Error queueing WhatsApp reminder:', error);
  }
};


const EventModal = ({
  isOpen,
  onClose,
  familyId,
  event,
  defaultDate,
  onEventSaved,
}: EventModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(""); // This will hold YYYY-MM-DDTHH:MM local string
  const [endTime, setEndTime] = useState("");     // This will hold YYYY-MM-DDTHH:MM local string
  const [color, setColor] = useState(COLORS[0]);
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { getSuggestions, loading: aiLoading } = useAIAssistant();
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);

  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(null);
  const [sendWhatsappReminder, setSendWhatsappReminder] = useState(false);
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  
  // Track invalid dates for visual feedback
  const [isStartTimeInvalid, setIsStartTimeInvalid] = useState(false);
  const [isEndTimeInvalid, setIsEndTimeInvalid] = useState(false);
  
  // Conflict detection state
  const [conflictingEvents, setConflictingEvents] = useState<Array<{ id: string; title: string; start_time: string; end_time: string }>>([]);
  
  const handleGetAISuggestions = async () => {
    setShowAISuggestions(true);
    try {
      const suggestions = await getSuggestions(title || "family event");
      setAISuggestions(suggestions);
      
      if (suggestions.length === 0) {
        toast({
          title: "No suggestions",
          description: "Try adding more events to get AI suggestions",
        });
      }
    } catch (error) {
      toast({
        title: "AI Assistant unavailable",
        description: "Unable to get suggestions at this time",
        variant: "destructive",
      });
    }
  };

  const applyAISuggestion = (suggestion: AISuggestion) => {
    setTitle(suggestion.title);
    setDescription(suggestion.description);
    setShowAISuggestions(false);
    
    toast({
      title: "Suggestion applied",
      description: "Feel free to edit the details",
    });
  };

  
  // Get current datetime for minimum validation
  const minDateTime = formatForDateTimeLocal(new Date());

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartTime("");
    setEndTime("");
    setColor(COLORS[0]);
    setNotes("");
    setChecklist([]);
    setNewChecklistItem("");
    setReminderOffsetMinutes(null);
    setSendWhatsappReminder(false);
    setIsRecurring(false);
    setRecurrenceType('');
    setRecurrenceEndDate('');
    setIsStartTimeInvalid(false);
    setIsEndTimeInvalid(false);
  };

  useEffect(() => {
    console.log("EventModal useEffect triggered. isOpen:", isOpen, "Event prop:", event, "DefaultDate:", defaultDate);

    if (isOpen) {
      if (event) {
        console.log("Populating modal with existing event data:", event.title);
        setTitle(event.title || "");
        setDescription(event.description || "");
        setLocation(event.location || "");
        
        // --- MODIFIED: Load times from UTC to local display ---
        setStartTime(event.start ? formatForDateTimeLocal(new Date(event.start)) : "");
        setEndTime(event.end ? formatForDateTimeLocal(new Date(event.end)) : "");
        // --- END MODIFIED ---

        setColor(event.color || COLORS[0]);
        setNotes(event.notes || "");
        setChecklist(event.checklist || []);

        if (event.reminder_settings && event.reminder_settings.length > 0) {
            const whatsappReminder = event.reminder_settings.find(
                (r: any) => r.method === 'whatsapp'
            );
            if (whatsappReminder) {
                setReminderOffsetMinutes(whatsappReminder.time_offset_minutes);
                setSendWhatsappReminder(true);
            } else {
                setReminderOffsetMinutes(null);
                setSendWhatsappReminder(false);
            }
        } else {
            setReminderOffsetMinutes(null);
            setSendWhatsappReminder(false);
        }

        // Parse recurrence_rule if present
        if (event.recurrence_rule) {
            setIsRecurring(true);
            const rrule = event.recurrence_rule;
            
            // Parse frequency
            const freqMatch = rrule.match(/FREQ=(\w+)/);
            if (freqMatch) {
                const freq = freqMatch[1].toLowerCase();
                setRecurrenceType(freq as any);
            }
            
            // Parse end date
            const untilMatch = rrule.match(/UNTIL=(\d{8})/);
            if (untilMatch) {
                const dateStr = untilMatch[1];
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                setRecurrenceEndDate(`${year}-${month}-${day}`);
            } else {
                setRecurrenceEndDate('');
            }
        } else {
            setIsRecurring(false);
            setRecurrenceType('');
            setRecurrenceEndDate('');
        }

      } else if (defaultDate) {
        console.log("Populating modal with default date:", defaultDate.toISOString());
        resetForm();
        
        // --- MODIFIED: Set default date to local current time ---
        const initialStartDate = new Date(defaultDate);
        setStartTime(formatForDateTimeLocal(initialStartDate));
        
        const initialEndDate = new Date(initialStartDate);
        initialEndDate.setHours(initialEndDate.getHours() + 1);
        setEndTime(formatForDateTimeLocal(initialEndDate));
        // --- END MODIFIED ---

      } else {
        console.log("Modal open but no event or defaultDate, resetting form.");
        resetForm();
        
        // --- MODIFIED: Set current time to local current time ---
        const now = new Date();
        setStartTime(formatForDateTimeLocal(now));
        
        const future = new Date(now);
        future.setHours(now.getHours() + 1);
        setEndTime(formatForDateTimeLocal(future));
        // --- END MODIFIED ---
      }
    } else {
      console.log("Modal is closing or not open, resetting form state.");
      resetForm();
    }
  }, [isOpen, event, defaultDate]);

  // Check for conflicts whenever time changes
  useEffect(() => {
    const checkConflicts = async () => {
      if (!startTime || !endTime || !familyId) return;
      
      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      
      // Only check if times are valid
      if (startDateTime >= endDateTime) {
        setConflictingEvents([]);
        return;
      }
      
      const conflicts = await checkForConflicts(startDateTime, endDateTime);
      setConflictingEvents(conflicts);
    };
    
    // Debounce the conflict check
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, familyId, event?.id]);

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist((prev) => [
        ...prev,
        { id: uuidv4(), text: newChecklistItem.trim(), completed: false },
      ]);
      setNewChecklistItem("");
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // Generate RRULE string for recurring events
  const generateRecurrenceRule = (): string | null => {
    if (!isRecurring || !recurrenceType) return null;
    
    const freqMap = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
      monthly: 'MONTHLY',
      yearly: 'YEARLY'
    };
    
    let rrule = `FREQ=${freqMap[recurrenceType]}`;
    
    // Add end date if specified
    if (recurrenceEndDate) {
      // Convert end date to RRULE format (YYYYMMDD)
      const endDate = new Date(recurrenceEndDate);
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      rrule += `;UNTIL=${year}${month}${day}`;
    }
    
    return rrule;
  };

  // Check for conflicting events
  const checkForConflicts = async (startDateTime: Date, endDateTime: Date) => {
    try {
      // Fetch all events in the family for the time range
      const { data: existingEvents, error } = await supabase
        .from("events")
        .select("id, title, start_time, end_time")
        .eq("family_id", familyId)
        .gte("end_time", startDateTime.toISOString())
        .lte("start_time", endDateTime.toISOString());

      if (error) throw error;

      // Filter out the current event if editing
      const conflicts = existingEvents?.filter(evt => {
        // Don't count the current event as a conflict
        if (event && evt.id === event.id) return false;
        
        // Check for time overlap
        const existingStart = new Date(evt.start_time);
        const existingEnd = new Date(evt.end_time);
        
        // Events overlap if: start < existing_end AND end > existing_start
        return startDateTime < existingEnd && endDateTime > existingStart;
      }) || [];

      return conflicts;
    } catch (error) {
      console.error("Error checking for conflicts:", error);
      return [];
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Title, Start, End)",
        variant: "destructive",
      });
      return;
    }

    // --- MODIFIED: Ensure new Date() interprets startTime/endTime as local ---
    // The Input type="datetime-local" provides a string like "YYYY-MM-DDTHH:MM"
    // new Date("YYYY-MM-DDTHH:MM") correctly interprets this in the local timezone.
    const startDateTime = new Date(startTime); 
    const endDateTime = new Date(endTime);
    const now = new Date();
    // --- END MODIFIED ---

    // Validate: Don't allow past dates
    if (startDateTime < now) {
      toast({
        title: "Invalid Date",
        description: "Cannot create events in the past. Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }

    if (startDateTime >= endDateTime) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    // Validate: Check if reminder time is in the past
    if (sendWhatsappReminder && reminderOffsetMinutes !== null) {
      const reminderTime = new Date(startDateTime.getTime() - reminderOffsetMinutes * 60 * 1000);
      if (reminderTime < now) {
        toast({
          title: "Invalid Reminder Time",
          description: `The reminder would be sent at ${reminderTime.toLocaleString()}, which is in the past. Please reduce the reminder time or change the event start time.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check for conflicting events
    const conflicts = await checkForConflicts(startDateTime, endDateTime);
    if (conflicts.length > 0) {
      const conflictTitles = conflicts.map(c => `• ${c.title}`).join('\n');
      const conflictTime = startDateTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      toast({
        title: "⚠️ Schedule Conflict",
        description: `You already have ${conflicts.length === 1 ? 'an event' : `${conflicts.length} events`} at ${conflictTime}:\n\n${conflictTitles}\n\nDo you want to continue anyway?`,
        variant: "destructive",
        duration: 6000,
      });
      
      // Show warning but don't prevent saving - let user decide
      // If you want to BLOCK saving instead, add: return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("No user found");
      const user = userData.user;

      const eventReminderSettings = [];
      if (sendWhatsappReminder && reminderOffsetMinutes !== null) {
          eventReminderSettings.push({
              method: 'whatsapp',
              time_offset_minutes: reminderOffsetMinutes,
          });
      }

      const recurrenceRule = generateRecurrenceRule();
      
      const eventData = {
        family_id: familyId,
        title,
        description,
        location,
        // --- Keep saving as ISO string (UTC) ---
        start_time: startDateTime.toISOString(), 
        end_time: endDateTime.toISOString(),
        // --- END Keep ---
        color,
        user_id: user.id,
        created_by: user.id,
        notes,
        checklist,
        reminder_settings: eventReminderSettings.length > 0 ? eventReminderSettings : [],
        recurrence_rule: recurrenceRule,
      };

      if (event) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", event.id);
        if (error) throw error;

        // Queue WhatsApp reminder for updated event
        if (sendWhatsappReminder && reminderOffsetMinutes !== null) {
          await queueWhatsAppReminder(event.id, title, startDateTime, reminderOffsetMinutes, user.id, description, location, notes, checklist);
        }

        toast({
          title: "Event updated",
          description: "Your event has been updated successfully",
        });
      } else {
        const { data: newEvent, error } = await supabase.from("events").insert([eventData]).select().single();
        if (error) throw error;

        // Queue WhatsApp reminder for new event
        if (sendWhatsappReminder && reminderOffsetMinutes !== null && newEvent) {
          await queueWhatsAppReminder(newEvent.id, title, startDateTime, reminderOffsetMinutes, user.id, description, location, notes, checklist);
        }

        toast({
          title: "Event created",
          description: "Your event has been created successfully",
        });
      }

      onEventSaved();
      onClose();
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while saving the event.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !event.id) {
        toast({
            title: "Error",
            description: "Cannot delete an event that doesn't exist.",
            variant: "destructive",
        });
        return;
    }

    setLoading(true);
    try {
      // For recurring events, the ID is in format: eventId-timestamp
      // We need to extract just the eventId part
      let eventIdToDelete = event.id;
      if (event.id.includes('-') && event.id.match(/.*-\d{4}-\d{2}-\d{2}T/)) {
        // This is a recurring event instance, extract the base event ID
        eventIdToDelete = event.id.split('-').slice(0, 5).join('-'); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      }

      const { error } = await supabase.from("events").delete().eq("id", eventIdToDelete);
      if (error) throw error;

      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });

      onEventSaved();
      onClose();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while deleting the event.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white" />
            {event ? "Edit Event" : "Create Event"}
          </DialogTitle>
          <DialogDescription>
            {event ? "Update event details" : "Add a new event to your calendar"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1 -mr-1 pr-3">
          {/* AI Suggestions Button */}
          {!event && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetAISuggestions}
                disabled={aiLoading}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? "Getting AI suggestions..." : "✨ AI Suggestions"}
              </Button>
            </div>
          )}

          {/* AI Suggestions Display */}
          {showAISuggestions && aiSuggestions.length > 0 && (
            <div className="p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Suggestions</span>
              </div>
              {aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-2 bg-white dark:bg-gray-800 rounded border hover:border-purple-400 cursor-pointer transition-colors"
                  onClick={() => applyAISuggestion(suggestion)}
                >
                  <p className="font-medium text-sm">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {suggestion.suggestedTime}
                  </p>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAISuggestions(false)}
                className="w-full text-xs"
              >
                Close suggestions
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes for this event..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-checklist-item" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Checklist
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-checklist-item"
                placeholder="Add a new checklist item"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <Button onClick={handleAddChecklistItem} type="button">
                Add
              </Button>
            </div>
            {checklist.length > 0 && (
              <ul className="space-y-2 mt-2">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer flex-grow">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="form-checkbox h-4 w-4 text-primary rounded"
                      />
                      <span
                        className={`${
                          item.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="Event location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="start" className={`flex items-center gap-2 ${isStartTimeInvalid ? "text-red-500" : ""}`}>
                <Clock className="h-4 w-4" />
                Start *
                {isStartTimeInvalid && <span className="text-xs">(Invalid)</span>}
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="start"
                  type="datetime-local"
                  value={startTime}
                  min={minDateTime}
                  className={isStartTimeInvalid ? "border-2 border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500 pr-10" : "pr-10"}
                  onChange={(e) => {
                    const selectedTime = e.target.value;
                    if (selectedTime && new Date(selectedTime) < new Date()) {
                      setIsStartTimeInvalid(true);
                      toast({
                        title: "⚠️ Invalid Date",
                        description: "Cannot select a date in the past. Please choose a future date.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsStartTimeInvalid(false);
                    setStartTime(selectedTime);
                  }}
                />
              </div>
              {isStartTimeInvalid && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <span>⚠️</span> Start time cannot be in the past
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end" className={`flex items-center gap-2 ${isEndTimeInvalid ? "text-red-500" : ""}`}>
                <Clock className="h-4 w-4" />
                End *
                {isEndTimeInvalid && <span className="text-xs">(Invalid)</span>}
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="end"
                  type="datetime-local"
                  value={endTime}
                  min={minDateTime}
                  className={isEndTimeInvalid ? "border-2 border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500 pr-10" : "pr-10"}
                  onChange={(e) => {
                    const selectedTime = e.target.value;
                    if (selectedTime && new Date(selectedTime) < new Date()) {
                      setIsEndTimeInvalid(true);
                      toast({
                        title: "⚠️ Invalid Date",
                        description: "Cannot select a date in the past. Please choose a future date.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsEndTimeInvalid(false);
                    setEndTime(selectedTime);
                  }}
                />
              </div>
              {isEndTimeInvalid && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <span>⚠️</span> End time cannot be in the past
                </p>
              )}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflictingEvents.length > 0 && (
            <div className="p-4 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    ⚠️ Schedule Conflict
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                    You already have {conflictingEvents.length === 1 ? 'an event' : `${conflictingEvents.length} events`} at this time:
                  </p>
                  <ul className="space-y-1">
                    {conflictingEvents.map((conflict) => {
                      const conflictStart = new Date(conflict.start_time);
                      const conflictEnd = new Date(conflict.end_time);
                      return (
                        <li key={conflict.id} className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span className="font-medium">{conflict.title}</span>
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            ({conflictStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - {conflictEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    You can still save this event, but be aware of the overlap.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color
            </Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-10 h-10 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="flex items-center gap-2 text-base font-semibold">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Repeat Event
              </Label>
              
              <div className="flex items-center space-x-3 p-3 bg-background rounded-md border">
                  <input
                      type="checkbox"
                      id="is-recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="is-recurring" className="cursor-pointer flex-1 text-sm">
                      Make this a recurring event
                  </Label>
              </div>

              {isRecurring && (
                  <div className="space-y-3">
                      <div className="flex gap-3 items-center p-3 bg-background rounded-md border">
                          <Label htmlFor="recurrence-type" className="text-sm font-medium whitespace-nowrap">Repeat</Label>
                          <select
                              id="recurrence-type"
                              value={recurrenceType}
                              onChange={(e) => setRecurrenceType(e.target.value as any)}
                              className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                              <option value="">Select frequency</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                          </select>
                      </div>
                      
                      <div className="flex gap-3 items-center p-3 bg-background rounded-md border">
                          <Label htmlFor="recurrence-end" className="text-sm font-medium whitespace-nowrap">Until</Label>
                          <Input
                              id="recurrence-end"
                              type="date"
                              value={recurrenceEndDate}
                              min={startTime ? startTime.split('T')[0] : minDateTime.split('T')[0]}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              className="flex-1"
                              placeholder="No end date"
                          />
                      </div>
                      
                      {recurrenceType && (
                        <p className="text-xs text-muted-foreground px-3">
                          {recurrenceType === 'daily' && '⏰ This event will repeat every day'}
                          {recurrenceType === 'weekly' && '📅 This event will repeat every week'}
                          {recurrenceType === 'monthly' && '📆 This event will repeat every month'}
                          {recurrenceType === 'yearly' && '🎂 This event will repeat every year'}
                          {recurrenceEndDate && ` until ${new Date(recurrenceEndDate).toLocaleDateString()}`}
                          {!recurrenceEndDate && ' (no end date)'}
                        </p>
                      )}
                  </div>
              )}
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="flex items-center gap-2 text-base font-semibold">
                  <Bell className="h-5 w-5 text-primary" />
                  WhatsApp Reminder
              </Label>
              
              <div className="flex items-center space-x-3 p-3 bg-background rounded-md border">
                  <input
                      type="checkbox"
                      id="send-whatsapp-reminder"
                      checked={sendWhatsappReminder}
                      onChange={(e) => setSendWhatsappReminder(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="send-whatsapp-reminder" className="cursor-pointer flex-1 text-sm">
                      Send me a WhatsApp notification before this event
                  </Label>
              </div>

              {sendWhatsappReminder && (
                  <div className="flex gap-3 items-center p-3 bg-background rounded-md border">
                      <Label htmlFor="reminder-offset" className="text-sm font-medium whitespace-nowrap">Remind me</Label>
                      <select
                          id="reminder-offset"
                          value={reminderOffsetMinutes === null ? '' : reminderOffsetMinutes}
                          onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}
                          className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                          <option value="">Select time</option>
                          <option value="5">5 minutes before</option>
                          <option value="10">10 minutes before</option>
                          <option value="15">15 minutes before</option>
                          <option value="30">30 minutes before</option>
                          <option value="60">1 hour before</option>
                          <option value="120">2 hours before</option>
                          <option value="1440">1 day before</option>
                      </select>
                  </div>
              )}
          </div>

          {/* Attendance & Gallery Section - Only show for existing events */}
          {event && event.id && !event.id.includes('T') && (
            <Tabs defaultValue="attendance" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attendance">👥 Attendance</TabsTrigger>
                <TabsTrigger value="gallery">
                  <Camera className="h-4 w-4 mr-2" />
                  Photos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="attendance" className="mt-4">
                <EventRSVP
                  eventId={event.id}
                  familyId={familyId}
                  eventTitle={title}
                  eventStartTime={startTime}
                />
              </TabsContent>
              <TabsContent value="gallery" className="mt-4">
                <EventGallery
                  eventId={event.id}
                  eventTitle={title}
                />
              </TabsContent>
            </Tabs>
          )}

        </div>

        <DialogFooter className="flex justify-between flex-shrink-0 pt-4 border-t">
          {event && (
            <div className="flex flex-col items-start gap-2 mr-auto">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {title.startsWith('🔁') ? 'Delete Series' : 'Delete'}
              </Button>
              {title.startsWith('🔁') && (
                <p className="text-xs text-muted-foreground">
                  This will delete all occurrences of this recurring event
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : event ? "Update" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;