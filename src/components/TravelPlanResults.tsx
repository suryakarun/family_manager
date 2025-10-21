import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Train, Bus, Plane, Clock, DollarSign, AlertCircle, Lightbulb, ArrowRight, Share2, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TravelPlanResultsProps {
  plan: {
    itinerary?: any;
    transportOptions?: any[];
    conflicts?: any[];
    suggestions?: any[];
  };
  eventDetails?: {
    eventTitle: string;
    eventDate: string;
    destination: string;
    currentLocation: string;
  };
}

const TransportIcon = ({ mode }: { mode: string }) => {
  switch (mode.toLowerCase()) {
    case "train":
      return <Train className="h-4 w-4" />;
    case "bus":
      return <Bus className="h-4 w-4" />;
    case "flight":
      return <Plane className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
};

export const TravelPlanResults = ({ plan, eventDetails }: TravelPlanResultsProps) => {
  const { toast } = useToast();

  if (!plan || !plan.itinerary) {
    return <div>No travel plan found. Please generate a plan first.</div>;
  }

  // Normalize arrays (same as before)
  let itineraryArray: any[] = [];
  if (Array.isArray(plan.itinerary)) {
    itineraryArray = plan.itinerary;
  } else if (plan.itinerary.timeline) {
    itineraryArray = plan.itinerary.timeline;
  } else if (typeof plan.itinerary === 'object') {
    itineraryArray = Object.entries(plan.itinerary)
      .filter(([k]) => k.startsWith('day'))
      .map(([k, v]) => ({ day: k, description: v }));
  }

  let transportOptionsArray: any[] = [];
  if (Array.isArray(plan.transportOptions)) {
    transportOptionsArray = plan.transportOptions;
  } else if (plan.transportOptions && typeof plan.transportOptions === 'object') {
    transportOptionsArray = Object.entries(plan.transportOptions)
      .filter(([k]) => typeof plan.transportOptions[k] === 'string')
      .map(([k, v]) => ({ mode: k, description: v }));
  }

  let conflictsArray: any[] = [];
  if (Array.isArray(plan.conflicts)) {
    conflictsArray = plan.conflicts;
  } else if (plan.conflicts && typeof plan.conflicts === 'object') {
    conflictsArray = Object.entries(plan.conflicts)
      .map(([k, v]) => ({ type: k, description: v }));
  }

  let suggestionsArray: any[] = [];
  if (Array.isArray(plan.suggestions)) {
    suggestionsArray = plan.suggestions;
  } else if (plan.suggestions && typeof plan.suggestions === 'object') {
    suggestionsArray = Object.entries(plan.suggestions)
      .flatMap(([k, v]) => Array.isArray(v) ? v.map((item: string) => ({ category: k, description: item })) : [{ category: k, description: v }]);
  }

  // Format travel plan for WhatsApp
  const formatForWhatsApp = () => {
    let message = `🎉 *${eventDetails?.eventTitle || 'Travel Plan'}*\n\n`;
    message += `📍 From: ${eventDetails?.currentLocation || 'N/A'}\n`;
    message += `📍 To: ${eventDetails?.destination || 'N/A'}\n`;
    message += `📅 Date: ${eventDetails?.eventDate || 'N/A'}\n\n`;

    if (plan.itinerary?.summary) {
      message += `📋 *Overview:*\n${plan.itinerary.summary}\n\n`;
    }

    if (itineraryArray.length > 0) {
      message += `⏱️ *Timeline:*\n`;
      itineraryArray.forEach((item: any) => {
        message += `• ${item.time}: ${item.description}\n`;
      });
      message += '\n';
    }

    if (transportOptionsArray.length > 0) {
      message += `🚆 *Transport Options:*\n`;
      transportOptionsArray.forEach((option: any, idx: number) => {
        message += `\n${idx + 1}. *${option.name || option.mode}*\n`;
        if (option.number) message += `   Number: ${option.number}\n`;
        if (option.operator) message += `   Operator: ${option.operator}\n`;
        if (option.departureTime) message += `   Departure: ${option.departureTime}\n`;
        if (option.arrivalTime) message += `   Arrival: ${option.arrivalTime}\n`;
        if (option.duration) message += `   Duration: ${option.duration}\n`;
        if (option.price) message += `   Price: ${option.price}\n`;
      });
      message += '\n';
    }

    if (suggestionsArray.length > 0) {
      message += `💡 *Places to Visit:*\n`;
      suggestionsArray.forEach((suggestion: any, idx: number) => {
        message += `\n${idx + 1}. *${suggestion.title || suggestion.category}*\n`;
        message += `   ${suggestion.description}\n`;
        if (suggestion.duration) message += `   ⏱️ ${suggestion.duration}\n`;
      });
    }

    return message;
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const message = formatForWhatsApp();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Opening WhatsApp",
      description: "Share your travel plan with family and friends!",
    });
  };

  // Add to Calendar (ICS format)
  const addToCalendar = () => {
    try {
      const eventTitle = eventDetails?.eventTitle || 'Travel Event';
      const destination = eventDetails?.destination || '';
      const currentLocation = eventDetails?.currentLocation || '';
      
      // Parse the date
      let startDate = new Date();
      if (eventDetails?.eventDate) {
        startDate = new Date(eventDetails.eventDate);
      }
      
      // Get first transport option for timing
      const firstTransport = transportOptionsArray[0];
      if (firstTransport?.departureTime) {
        const timeMatch = firstTransport.departureTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const isPM = timeMatch[3].toUpperCase() === 'PM';
          
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          
          startDate.setHours(hours, minutes, 0, 0);
        }
      }

      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

      // Format dates for ICS
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      // Build description
      let description = plan.itinerary?.summary || `Travel from ${currentLocation} to ${destination}`;
      if (firstTransport) {
        description += `\\n\\nTransport: ${firstTransport.name || firstTransport.mode}`;
        if (firstTransport.number) description += ` (${firstTransport.number})`;
        if (firstTransport.departureTime) description += `\\nDeparture: ${firstTransport.departureTime}`;
        if (firstTransport.arrivalTime) description += `\\nArrival: ${firstTransport.arrivalTime}`;
      }

      // Create ICS content
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Travel Planner//EN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@travelplanner.com`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${destination}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      // Create blob and download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${eventTitle.replace(/\s+/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Calendar event created!",
        description: "Open the downloaded file to add to your calendar.",
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create calendar event.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card className="shadow-[var(--shadow-card)] bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={shareViaWhatsApp} className="flex-1 gap-2" variant="default">
              <Share2 className="h-4 w-4" />
              Share via WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Itinerary Overview */}
      {itineraryArray.length > 0 && (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Your Itinerary</CardTitle>
            </div>
            {plan.itinerary.summary && (
              <CardDescription>{plan.itinerary.summary}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {itineraryArray.map((item: any, index: number) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  {index < itineraryArray.length - 1 && (
                    <div className="h-full w-0.5 bg-border my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.day || item.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transport Options */}
      {transportOptionsArray.length > 0 && (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Transport Options</CardTitle>
            <CardDescription>Available options for your journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transportOptionsArray.map((option: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TransportIcon mode={option.mode || option.category || ''} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{option.name || option.mode || option.category}</h4>
                      {option.number && (
                        <p className="text-sm text-muted-foreground">#{option.number}</p>
                      )}
                      {option.operator && (
                        <p className="text-sm text-muted-foreground">{option.operator}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {option.mode || option.category}
                  </Badge>
                </div>

                {(option.departureTime || option.arrivalTime) && (
                  <div className="flex items-center gap-4 mb-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Departure</p>
                      <p className="font-medium">{option.departureTime || 'TBD'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Arrival</p>
                      <p className="font-medium">{option.arrivalTime || 'TBD'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm">
                  {option.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{option.duration}</span>
                    </div>
                  )}
                  {option.price && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-primary">{option.price}</span>
                    </div>
                  )}
                </div>

                {option.description && !option.name && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Family Conflicts */}
      {conflictsArray.length > 0 && (
        <Card className="shadow-[var(--shadow-card)] border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Schedule Conflicts</CardTitle>
            </div>
            <CardDescription>Potential issues to consider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflictsArray.map((conflict: any, index: number) => (
              <div key={index} className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="font-medium text-destructive">{conflict.type}</p>
                <p className="text-sm text-muted-foreground mt-1">{conflict.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestionsArray.length > 0 && (
        <Card className="shadow-[var(--shadow-card)] border-accent/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              <CardTitle>Smart Suggestions</CardTitle>
            </div>
            <CardDescription>Things to do and places to visit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestionsArray.map((suggestion: any, index: number) => (
              <div key={index} className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-lg">
                    {suggestion.title || suggestion.category}
                  </h4>
                  {suggestion.duration && (
                    <Badge variant="outline" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {suggestion.duration}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {suggestion.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};