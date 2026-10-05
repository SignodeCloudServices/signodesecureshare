import { DeploymentPage } from "@/pages/DeploymentPage";
import { RunbooksPage } from "@/pages/RunbooksPage";
import { ControlsPage } from "@/pages/ControlsPage";
import { BuildGuidePage } from "@/pages/BuildGuidePage";
import { SecurityPage } from "@/pages/SecurityPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import { Routes, Route } from "react-router-dom";
import { SignodeHeader } from "@/components/signode/SignodeHeader";
import { SignInGate } from "@/components/signode/SignInGate";
import { RequireAdmin } from "@/components/signode/RequireAdmin";
import { Toaster } from "@/components/ui/toaster";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent } from "@/components/ui/card";
import { HomePage } from "@/pages/HomePage";
import { HelpPage } from "@/pages/HelpPage";
import { BrowsePage } from "@/pages/BrowsePage";
import { UploadPage } from "@/pages/UploadPage";
import { RecentPage } from "@/pages/RecentPage";

function PlaceholderPage({ name }: { name: string }) {
  const { persona } = usePersona();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Card>
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
            {name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            This page will be filled in during Batches 5–6.
          </p>
          <p className="mt-4 text-sm">
            You are currently viewing as{" "}
            <strong>{persona.displayName}</strong> ({persona.role}).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[hsl(var(--signode-cream))]">
      <SignodeHeader />
      <SignInGate />
      <Toaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/recent" element={<RecentPage />} />
        <Route path="/help" element={<HelpPage />} />
        {/* Internal documentation. Nav hides these for non-admins; RequireAdmin
            is what actually blocks them — see the component for why both. */}
        <Route path="/build-guide" element={<RequireAdmin><BuildGuidePage /></RequireAdmin>} />
        <Route path="/architecture" element={<RequireAdmin><ArchitecturePage /></RequireAdmin>} />
        <Route path="/security" element={<RequireAdmin><SecurityPage /></RequireAdmin>} />
        <Route path="/controls" element={<RequireAdmin><ControlsPage /></RequireAdmin>} />
        <Route path="/deployment" element={<RequireAdmin><DeploymentPage /></RequireAdmin>} />
        <Route path="/runbooks" element={<RequireAdmin><RunbooksPage /></RequireAdmin>} />
        <Route path="/source" element={<RequireAdmin><PlaceholderPage name="Source & IaC" /></RequireAdmin>} />
        <Route
          path="*"
          element={<PlaceholderPage name="Page not found" />}
        />
      </Routes>
    </div>
  );
}