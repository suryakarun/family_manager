import "./app.mobile.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/index";
import Auth from "./pages/auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/dashboard";
import JoinFamily from "./pages/JoinFamily";
import Profile from "./pages/Profile";
import NotFound from "./pages/notfound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Invite links (v6 has no optional params, so declare both) */}
          <Route path="/join-family/:inviteToken" element={<JoinFamily />} />
          <Route path="/join-family/:familyId/:inviteToken" element={<JoinFamily />} />
          <Route path="/join-family" element={<JoinFamily />} />

          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
