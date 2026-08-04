import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AxionProvider } from "@/context/AxionContext";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/layout/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import ProgramsPage from "@/pages/ProgramsPage";
import LifecycleStagePage from "@/pages/lifecycle/LifecycleStagePage";
import AiRecommendationsPage from "@/pages/AiRecommendationsPage";
import AuditPage from "@/pages/AuditPage";
import CatalogPage from "@/pages/CatalogPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
              <Route path="/" element={<Navigate to="/overview" replace />} />
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
