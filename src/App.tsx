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
import OnboardingSurvey from "./pages/onboarding/OnboardingSurvey";
import RoleSelect from "./pages/onboarding/RoleSelect";
import PlanSelect from "./pages/onboarding/PlanSelect";
import GroupSetup from "./pages/onboarding/GroupSetup";
import Home from "./pages/Home";
import Devotional from "./pages/Devotional";
import CommuteMode from "./pages/CommuteMode";
import Waiting from "./pages/Waiting";
import CompareNotes from "./pages/CompareNotes";
import Groups from "./pages/Groups";
import ThemePicker from "./pages/ThemePicker";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/SettingsPage";
import Analytics from "./pages/Analytics";
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
import HelpCenter from "./pages/HelpCenter";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

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
              <Route path="/onboarding/profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
              <Route path="/onboarding/survey" element={<ProtectedRoute><OnboardingSurvey /></ProtectedRoute>} />
              <Route path="/onboarding/role" element={<ProtectedRoute><RoleSelect /></ProtectedRoute>} />
              <Route path="/onboarding/plan" element={<ProtectedRoute><PlanSelect /></ProtectedRoute>} />
              <Route path="/onboarding/group" element={<ProtectedRoute><GroupSetup /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/devotional" element={<ProtectedRoute><Devotional /></ProtectedRoute>} />
              <Route path="/devotional/commute" element={<ProtectedRoute><CommuteMode /></ProtectedRoute>} />
              <Route path="/waiting" element={<ProtectedRoute><Waiting /></ProtectedRoute>} />
              <Route path="/compare" element={<ProtectedRoute><CompareNotes /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
              <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
              <Route path="/plans/completed" element={<ProtectedRoute><CompletedPlans /></ProtectedRoute>} />
              <Route path="/plans/completed/:planId" element={<ProtectedRoute><CompletedPlanReview /></ProtectedRoute>} />
              <Route path="/plans/:category" element={<ProtectedRoute><PlanList /></ProtectedRoute>} />
              <Route path="/themes" element={<ProtectedRoute><ThemePicker /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><CommunityFeed /></ProtectedRoute>} />
              <Route path="/discipler-notes" element={<ProtectedRoute><DisciplerNotes /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute><FamilyDashboard /></ProtectedRoute>} />
              <Route path="/onboarding/family" element={<ProtectedRoute><FamilyOnboarding /></ProtectedRoute>} />
              <Route path="/family/add-child" element={<ProtectedRoute><AddChildProfile /></ProtectedRoute>} />
              <Route path="/family/parent-dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
              <Route path="/youth/home" element={<ProtectedRoute><YouthHome /></ProtectedRoute>} />
              <Route path="/youth/devotional" element={<ProtectedRoute><YouthDevotional /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
