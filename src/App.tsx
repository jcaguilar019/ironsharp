import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompleteProfile from "./pages/onboarding/CompleteProfile";
import RoleSelect from "./pages/onboarding/RoleSelect";
import PlanSelect from "./pages/onboarding/PlanSelect";
import GroupSetup from "./pages/onboarding/GroupSetup";
import Home from "./pages/Home";
import Devotional from "./pages/Devotional";
import Waiting from "./pages/Waiting";
import CompareNotes from "./pages/CompareNotes";
import Groups from "./pages/Groups";
import ThemePicker from "./pages/ThemePicker";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding/profile" element={<CompleteProfile />} />
              <Route path="/onboarding/role" element={<RoleSelect />} />
              <Route path="/onboarding/plan" element={<PlanSelect />} />
              <Route path="/onboarding/group" element={<GroupSetup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/devotional" element={<Devotional />} />
              <Route path="/waiting" element={<Waiting />} />
              <Route path="/compare" element={<CompareNotes />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/themes" element={<ThemePicker />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
