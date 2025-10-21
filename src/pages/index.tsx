import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Sparkles, Heart, Clock, Bell } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <div className="bg-gradient-primary p-4 rounded-2xl shadow-elegant mb-4 inline-block">
              <Calendar className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Family Smart Calendar
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Keep your family organized, connected, and happy with AI-powered scheduling
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="text-lg px-8 shadow-elegant"
              onClick={() => navigate("/auth")}
            >
              Get Started
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-primary/10 p-3 rounded-lg w-fit mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Interactive Calendar</h3>
            <p className="text-muted-foreground">
              Beautiful, drag-and-drop calendar with month, week, and day views
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-accent/10 p-3 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Family Collaboration</h3>
            <p className="text-muted-foreground">
              Share calendars, invite members, and manage RSVPs together
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-success/10 p-3 rounded-lg w-fit mb-4">
              <Sparkles className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
            <p className="text-muted-foreground">
              Get smart suggestions for best times and conflict detection
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-warning/10 p-3 rounded-lg w-fit mb-4">
              <Bell className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Reminders</h3>
            <p className="text-muted-foreground">
              WhatsApp notifications and automated reminder system
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-primary-glow/10 p-3 rounded-lg w-fit mb-4">
              <Clock className="h-6 w-6 text-primary-glow" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Travel Time</h3>
            <p className="text-muted-foreground">
              Automatic ETA calculations with Google Maps integration
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-card border-2 hover:shadow-elegant transition-all">
            <div className="bg-accent-light p-3 rounded-lg w-fit mb-4">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Event To-Dos</h3>
            <p className="text-muted-foreground">
              Attach checklists, notes, and files to every event
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto bg-gradient-primary rounded-2xl p-12 text-center shadow-elegant">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to organize your family?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8">
            Join families who trust our smart calendar to keep everyone connected
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Start Free Today
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
