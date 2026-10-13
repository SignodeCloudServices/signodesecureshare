import * as React from "react";
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

// ---------------------------------------------------------------------------
// Internal documentation routes — WS1.3. See src/lib/admin-docs.ts.
//
// Dynamic imports inside a branch that is constant-false unless the build sets
// VITE_INCLUDE_ADMIN_DOCS=true. In every deployed build the branch is dead and
// none of these pages is emitted. The env var is compared HERE, inline, so the
// bundler sees a literal; do not replace it with an imported constant.
// ---------------------------------------------------------------------------
type DocRoute = { path: string; Page: React.LazyExoticComponent<() => React.JSX.Element> };

const ADMIN_DOC_ROUTES: DocRoute[] =
  import.meta.env.VITE_INCLUDE_ADMIN_DOCS === "true"
    ? [
        { path: "/build-guide", Page: React.lazy(() => import("@/pages/BuildGuidePage").then((m) => ({ default: m.BuildGuidePage }))) },
        { path: "/architecture", Page: React.lazy(() => import("@/pages/ArchitecturePage").then((m) => ({ default: m.ArchitecturePage }))) },
        { path: "/security", Page: React.lazy(() => import("@/pages/SecurityPage").then((m) => ({ default: m.SecurityPage }))) },
        { path: "/controls", Page: React.lazy(() => import("@/pages/ControlsPage").then((m) => ({ default: m.ControlsPage }))) },
        { path: "/deployment", Page: React.lazy(() => import("@/pages/DeploymentPage").then((m) => ({ default: m.DeploymentPage }))) },
        { path: "/runbooks", Page: React.lazy(() => import("@/pages/RunbooksPage").then((m) => ({ default: m.RunbooksPage }))) },
      ]
    : [];

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
        {/* Internal documentation: present only in builds with
            VITE_INCLUDE_ADMIN_DOCS=true (local only). RequireAdmin still guards
            them there; in deployed builds they do not exist. */}
        {ADMIN_DOC_ROUTES.map(({ path, Page }) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireAdmin>
                <React.Suspense fallback={null}>
                  <Page />
                </React.Suspense>
              </RequireAdmin>
            }
          />
        ))}
        <Route
          path="*"
          element={<PlaceholderPage name="Page not found" />}
        />
      </Routes>
    </div>
  );
}