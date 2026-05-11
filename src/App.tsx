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
import CommunityFeed from "./pages/CommunityFeed";
import DisciplerNotes from "./pages/DisciplerNotes";
import FamilyDashboard from "./pages/FamilyDashboard";
import FamilyOnboarding from "./pages/FamilyOnboarding";
import AddChildProfile from "./pages/AddChildProfile";
import ParentDashboard from "./pages/ParentDashboard";
import YouthHome from "./pages/YouthHome";
import YouthDevotional from "./pages/YouthDevotional";
import Plans from "./pages/Plans";
import PlanList from "./pages/PlanList";
import CompletedPlans from "./pages/CompletedPlans";
import CompletedPlanReview from "./pages/CompletedPlanReview";
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
              <Route path="/plans" element={<Plans />} />
              <Route path="/plans/completed" element={<CompletedPlans />} />
              <Route path="/plans/completed/:planId" element={<CompletedPlanReview />} />
              <Route path="/plans/:category" element={<PlanList />} />
              <Route path="/themes" element={<ThemePicker />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/community" element={<CommunityFeed />} />
              <Route path="/discipler-notes" element={<DisciplerNotes />} />
              <Route path="/family" element={<FamilyDashboard />} />
              <Route path="/onboarding/family" element={<FamilyOnboarding />} />
              <Route path="/family/add-child" element={<AddChildProfile />} />
              <Route path="/family/parent-dashboard" element={<ParentDashboard />} />
              <Route path="/youth/home" element={<YouthHome />} />
              <Route path="/youth/devotional" element={<YouthDevotional />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
