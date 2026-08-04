import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AxionProvider } from "@/context/AxionContext";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/layout/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import PortfolioPage from "@/pages/PortfolioPage";
import InitiativesPage from "@/pages/InitiativesPage";
import InitiativeDashboardPage from "@/pages/InitiativeDashboardPage";
import OverviewPage from "@/pages/OverviewPage";
import ProgramsPage from "@/pages/ProgramsPage";
import LifecycleStagePage from "@/pages/lifecycle/LifecycleStagePage";
import AiRecommendationsPage from "@/pages/AiRecommendationsPage";
import AuditPage from "@/pages/AuditPage";
import CatalogPage from "@/pages/CatalogPage";
import NotFoundPage from "@/pages/NotFoundPage";
import {
  AdministrationPage,
  AgentforceStudioPage,
  ArchitecturePage,
  AssessmentsPage,
  ConnectivityPage,
  DataProductsPage,
  DeploymentPage,
  GovernanceRiskPage,
  IdentityPage,
  MonitoringPage,
  TemplatesPage,
  TrustCompliancePage,
  ValidationPage,
} from "@/pages/modules/ModulePages";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AxionProvider>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Navigate to="/portfolio" replace />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/initiatives" element={<InitiativesPage />} />
              <Route path="/initiatives/:initiativeId" element={<InitiativeDashboardPage />} />
              <Route path="/assessments" element={<AssessmentsPage />} />
              <Route path="/architecture" element={<ArchitecturePage />} />
              <Route path="/data-products" element={<DataProductsPage />} />
              <Route path="/connectivity" element={<ConnectivityPage />} />
              <Route path="/identity" element={<IdentityPage />} />
              <Route path="/trust-compliance" element={<TrustCompliancePage />} />
              <Route path="/governance-risk" element={<GovernanceRiskPage />} />
              <Route path="/agentforce-studio" element={<AgentforceStudioPage />} />
              <Route path="/validation" element={<ValidationPage />} />
              <Route path="/deployment" element={<DeploymentPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/administration" element={<AdministrationPage />} />

              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/lifecycle" element={<Navigate to="/lifecycle/discover" replace />} />
              <Route path="/lifecycle/:stageId" element={<LifecycleStagePage />} />
              <Route path="/ai-recommendations" element={<AiRecommendationsPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </AxionProvider>
  </QueryClientProvider>
);

export default App;
