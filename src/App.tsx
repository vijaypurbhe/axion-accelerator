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
import LifecycleManagerPage from "@/pages/lifecycle/LifecycleManagerPage";
import AssessmentPage from "@/pages/assessment/AssessmentPage";
import ArchitectureStudioPage from "@/pages/architecture/ArchitectureStudioPage";
import AiRecommendationsPage from "@/pages/AiRecommendationsPage";
import AuditPage from "@/pages/AuditPage";
import CatalogPage from "@/pages/CatalogPage";
import DataProductLibraryPage from "@/pages/dataproducts/DataProductLibraryPage";
import DataProductDetailPage from "@/pages/dataproducts/DataProductDetailPage";
import DataProductBuilderPage from "@/pages/dataproducts/DataProductBuilderPage";
import SourceCatalogPage from "@/pages/dataproducts/SourceCatalogPage";
import MappingWorkbenchPage from "@/pages/dataproducts/MappingWorkbenchPage";
import MetadataImportWizardPage from "@/pages/dataproducts/MetadataImportWizardPage";
import ConnectivityDecisionPage from "@/pages/connectivity/ConnectivityDecisionPage";
import IdentityStudioPage from "@/pages/identity/IdentityStudioPage";
import TrustCompliancePage from "@/pages/trust/TrustCompliancePage";
import GovernanceRiskPage from "@/pages/governance/GovernanceRiskPage";
import AgentPortfolioPage from "@/pages/agentforce/AgentPortfolioPage";
import AgentWizardPage from "@/pages/agentforce/AgentWizardPage";
import AgentWorkbenchPage from "@/pages/agentforce/AgentWorkbenchPage";
import NotFoundPage from "@/pages/NotFoundPage";
import {
  AdministrationPage,
  DeploymentPage,
  MonitoringPage,
  TemplatesPage,
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
              <Route path="/assessments" element={<AssessmentPage />} />
              <Route path="/architecture" element={<ArchitectureStudioPage />} />
              <Route path="/data-products" element={<DataProductLibraryPage />} />
              <Route path="/data-products/new" element={<DataProductBuilderPage />} />
              <Route path="/data-products/:productId" element={<DataProductDetailPage />} />
              <Route path="/sources" element={<SourceCatalogPage />} />
              <Route path="/metadata-import" element={<MetadataImportWizardPage />} />
              <Route path="/mapping" element={<MappingWorkbenchPage />} />
              <Route path="/connectivity" element={<ConnectivityDecisionPage />} />
              <Route path="/identity" element={<IdentityStudioPage />} />
              <Route path="/trust-compliance" element={<TrustCompliancePage />} />
              <Route path="/governance-risk" element={<GovernanceRiskPage />} />
              <Route path="/agentforce-studio" element={<AgentPortfolioPage />} />
              <Route path="/agentforce-studio/new" element={<AgentWizardPage />} />
              <Route path="/agentforce-studio/:agentId" element={<AgentWorkbenchPage />} />
              <Route path="/validation" element={<ValidationPage />} />
              <Route path="/deployment" element={<DeploymentPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/administration" element={<AdministrationPage />} />

              <Route path="/lifecycle-manager" element={<Navigate to="/lifecycle-manager/discover" replace />} />
              <Route path="/lifecycle-manager/:stageId" element={<LifecycleManagerPage />} />

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
