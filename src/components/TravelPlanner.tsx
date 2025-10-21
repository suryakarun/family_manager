import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

interface TravelPlannerProps {
  onPlanGenerated: (plan: any, eventDetails: any) => void;
}

export const TravelPlanner = ({ onPlanGenerated }: TravelPlannerProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const eventTitle = formData.get("eventTitle") as string || "Trip";
    const eventDate = formData.get("eventDate") as string;
    const durationStr = formData.get("duration") as string;
    const destination = formData.get("destination") as string;
    const currentLocation = formData.get("currentLocation") as string;
    const transportMode = formData.get("transportMode") as string || "train";
    const description = formData.get("description") as string || "";

    let duration = parseInt(durationStr);
    if (!duration || isNaN(duration)) {
      duration = 1;
    }

    // Store event details to pass back
    const eventDetails = {
      eventTitle,
      eventDate,
      destination,
      currentLocation,
      transportMode,
      duration,
      description
    };

    try {
      const { data, error } = await supabase.functions.invoke("plan-travel", {
        body: {
          eventTitle,
          eventDate,
          duration,
          destination,
          currentLocation,
          transportMode,
          description,
        },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      console.log("Received travel plan:", data);

      toast({
        title: "Travel plan generated!",
        description: "Your AI-powered itinerary is ready.",
      });

      // Pass both plan and event details
      onPlanGenerated(data, eventDetails);
      
    } catch (error: any) {
      console.error("TravelPlanner error:", error);
      toast({
        variant: "destructive",
        title: "Error generating plan",
        description: error.message || String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <CardTitle>AI Travel Planner</CardTitle>
        </div>
        <CardDescription>
          Get intelligent travel recommendations and conflict detection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Event Name</Label>
              <Input
                id="eventTitle"
                name="eventTitle"
                placeholder="e.g., Wedding Ceremony"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min="1"
                defaultValue="1"
                placeholder="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transportMode">Transport Mode</Label>
              <Select name="transportMode" defaultValue="train" required>
                <SelectTrigger id="transportMode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="train">Train</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="flight">Flight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentLocation">Current Location</Label>
              <Input
                id="currentLocation"
                name="currentLocation"
                placeholder="e.g., Mumbai, India"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                name="destination"
                placeholder="e.g., Delhi, India"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Any special requirements or preferences..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Travel Plan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};