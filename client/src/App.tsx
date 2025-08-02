import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ReceivePage from "./pages/ReceivePage";
import { SubscriptionSuccess } from "./pages/SubscriptionSuccess";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <div className="dark">
          <Toaster />
          <Sonner />
          <Router>
            <Switch>
              <Route path="/" component={Index} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/receive/:token" component={ReceivePage} />
              <Route path="/subscription-success" component={SubscriptionSuccess} />
              {/* Add more routes as components are migrated */}
              <Route component={NotFound} />
            </Switch>
          </Router>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;