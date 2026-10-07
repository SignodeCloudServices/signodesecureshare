import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { usePersona } from "@/lib/persona-context";
import { useAuth, DEMO_MODE } from "@/lib/auth-context";
import { LiveScopedBrowser } from "./LiveScopedBrowser";
import { isPathInScope } from "@/lib/personas";
import { FOLDER_TREE, findNode, type FolderNode } from "@/lib/folderTree";
import { FILE_RETENTION_DAYS, expirySeverity } from "@/lib/retention";
import { AccessRestricted } from "@/components/signode/AccessRestricted";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Home as HomeIcon,
  Download,
  Lock,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock file data
// ---------------------------------------------------------------------------

function mockFilesFor(path: string) {
  const names = [
    "Q3-forecast.xlsx",
    "vendor-brief.pdf",
    "campaign-assets.zip",
    "contract-draft.docx",
    "audit-notes.txt",
  ];
  const seed = path.length;
  const count = (seed % 4) + 1;
  return Array.from({ length: count }, (_, i) => {
    // Spread mock ages across the retention window so every badge colour is
    // exercised, rather than clustering in the final few days.
    const ageDays = ((seed + i * 13) % 85) + 1;
    return {
      name: names[(seed + i) % names.length],
      size: `${((seed + i * 37) % 900) + 20} KB`,
      uploaded: ageDays === 1 ? "yesterday" : `${ageDays} days ago`,
      expiresInDays: FILE_RETENTION_DAYS - ageDays,
    };
  });
}

// Thresholds come from the retention module. They were previously tuned to a
// 7-day window (critical at 2 days, warning at 4), which is meaningless
// against the ratified 90-day retention period.
function expiryBadge(days: number) {
  switch (expirySeverity(days)) {
    case "expired":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Expired</Badge>;
    case "critical":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Expires in {days}d</Badge>;
    case "warning":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expires in {days}d</Badge>;
    default:
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Expires in {days}d</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasScopedDescendant(persona: any, path: string): boolean {
  if (persona.scopedPaths.includes("*")) return true;
  return persona.scopedPaths.some((s: string) => s.startsWith(path + "/"));
}

// The persona's "home" folder — the first (and usually only) path in their scope.
// For Global Admin the home is the tree root.
function personaHomePath(persona: any): string {
  if (persona.scopedPaths.includes("*")) return FOLDER_TREE.path;
  return persona.scopedPaths[0] || FOLDER_TREE.path;
}

// ---------------------------------------------------------------------------
// Admin tree navigator (unchanged behavior)
// ---------------------------------------------------------------------------

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  expanded,
  toggle,
  personaScopeCheck,
}: {
  node: FolderNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  expanded: Record<string, boolean>;
  toggle: (path: string) => void;
  personaScopeCheck: (path: string) => boolean;
}) {
  const isOpen = expanded[node.path] ?? depth < 1;
  const inScope = personaScopeCheck(node.path);
  const hasChildren = !!node.children?.length;
  const isSelected = node.path === selectedPath;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) toggle(node.path);
          onSelect(node.path);
        }}
        className={[
          "w-full flex items-center gap-1 px-2 py-1 rounded text-sm text-left",
          isSelected
            ? "bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange-deep))] font-semibold"
            : "hover:bg-muted",
          !inScope && "opacity-50",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {node.path === FOLDER_TREE.path ? (
          <HomeIcon className="h-4 w-4 shrink-0 text-[hsl(var(--signode-orange))]" />
        ) : isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-[hsl(var(--signode-orange))]" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-[hsl(var(--signode-orange))]" />
        )}
        <span className="truncate">{node.name}</span>
        {!inScope && <Lock className="h-3 w-3 ml-auto shrink-0" />}
      </button>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((c) => (
            <TreeNode
              key={c.path}
              node={c}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expanded={expanded}
              toggle={toggle}
              personaScopeCheck={personaScopeCheck}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Non-admin scoped browser — no tree, just scope-relative navigation
// ---------------------------------------------------------------------------

function ScopedBrowser({
  homePath,
  currentPath,
  onNavigate,
}: {
  homePath: string;
  currentPath: string;
  onNavigate: (p: string) => void;
}) {
  const node = findNode(FOLDER_TREE, currentPath);
  if (!node) {
    return <AccessRestricted attemptedPath={currentPath} />;
  }

  // The user's "home" node — used to display friendly labels
  const homeNode = findNode(FOLDER_TREE, homePath);
  const homeName = homeNode?.name ?? "Home";

  // Build a scope-relative breadcrumb: everything above the home path is hidden
  const isAtHome = currentPath === homePath;
  const parentPath = isAtHome
    ? null
    : currentPath.substring(0, currentPath.lastIndexOf("/"));

  // Breadcrumb segments — from home down to current
  const relative = currentPath.substring(homePath.length);
  const segments = relative
    .split("/")
    .filter(Boolean); // drop leading empty from the initial "/"

  const crumbs: { label: string; path: string }[] = [
    { label: homeName, path: homePath },
  ];
  let acc = homePath;
  for (const seg of segments) {
    acc = `${acc}/${seg}`;
    crumbs.push({ label: seg, path: acc });
  }

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="rounded-md p-2 bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange))]">
            <HomeIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Your workspace
            </div>
            <div className="font-semibold text-[hsl(var(--signode-black))] truncate">
              {homeName}
            </div>
          </div>
          {!isAtHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => parentPath && onNavigate(parentPath)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Breadcrumb — scope-relative */}
      <div className="flex items-center gap-1 flex-wrap text-sm text-muted-foreground px-1">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.path}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            <button
              onClick={() => onNavigate(c.path)}
              className={[
                "px-1 py-0.5 rounded hover:bg-muted",
                i === crumbs.length - 1
                  ? "font-semibold text-[hsl(var(--signode-black))]"
                  : "",
              ].join(" ")}
            >
              {c.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Detail (subfolders + files) */}
      <FolderDetail node={node} onNavigate={onNavigate} showBreadcrumb={false} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared folder detail (subfolders + files)
// ---------------------------------------------------------------------------

function FolderDetail({
  node,
  onNavigate,
  showBreadcrumb = true,
}: {
  node: FolderNode;
  onNavigate?: (path: string) => void;
  showBreadcrumb?: boolean;
}) {
  const files = mockFilesFor(node.path);
  const crumbs = node.path.split("/");

  return (
    <div className="space-y-4">
      {showBreadcrumb && (
        <div className="flex items-center gap-1 flex-wrap text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span
                className={
                  i === crumbs.length - 1
                    ? "font-semibold text-[hsl(var(--signode-black))]"
                    : ""
                }
              >
                {c}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {node.children && node.children.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Subfolders
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {node.children.map((c) => (
                <button
                  key={c.path}
                  onClick={() => onNavigate?.(c.path)}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm text-left hover:border-[hsl(var(--signode-orange))] transition-colors"
                >
                  <Folder className="h-4 w-4 text-[hsl(var(--signode-orange))] shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Files ({files.length})
          </div>
          <div className="divide-y">
            {files.map((f, i) => (
              <div
                key={i}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{f.name}</span>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {f.size} &middot; {f.uploaded}
                </div>
                {expiryBadge(f.expiresInDays)}
                <Button size="sm" variant="ghost" className="h-7">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Live mode routes everyone except administrators to the scoped browser: it
 * opens at their own folder and exposes nothing above or beside it. The tree
 * navigator below is the admin view and the demo-mode experience.
 */
export function BrowsePage() {
  const { isAdmin, isAuthenticated } = useAuth();

  // Live mode always uses the Graph-backed browser. The tree navigator below
  // reads the static folderTree.ts and is demo-mode only — rendering it for an
  // admin would show mock folders beside real ones.
  if (!DEMO_MODE) {
    if (!isAuthenticated) return null;
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Browse
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isAdmin
            ? "Administrator view of the Signode folder tree."
            : "Files shared with you."}
        </p>
        <div className="mt-6">
          <LiveScopedBrowser />
        </div>
      </div>
    );
  }

  return <BrowsePageInner />;
}

function BrowsePageInner() {
  const { persona } = usePersona();
  const [params, setParams] = useSearchParams();

  const isAdmin = persona.scopedPaths.includes("*");
  const homePath = personaHomePath(persona);

  // Default landing:
  // - Admin: FileRoot (top of the tree)
  // - Everyone else: their home (first scoped path)
  const initial = params.get("path") || homePath;
  const [selectedPath, setSelectedPath] = React.useState(initial);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    [FOLDER_TREE.path]: true,
  });

  // If persona changes (e.g. via switcher), reset to their home
  React.useEffect(() => {
    setSelectedPath(homePath);
    setParams({ path: homePath });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id]);

  const scopeCheck = React.useCallback(
    (p: string) => isPathInScope(persona, p) || hasScopedDescendant(persona, p),
    [persona]
  );

  function onSelect(p: string) {
    setSelectedPath(p);
    setParams({ path: p });
  }
  function toggle(p: string) {
    setExpanded((prev) => ({ ...prev, [p]: !(prev[p] ?? false) }));
  }

  // -----------------------------------------------------------------------
  // Non-admin view — no tree at all
  // -----------------------------------------------------------------------
  if (!isAdmin) {
    // If they tried to navigate outside their scope via URL, show restricted
    const canView = isPathInScope(persona, selectedPath);
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
            Browse
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your assigned workspace. Contact your internal Signode Support
            Contact if you need access to a different folder.
          </p>
        </div>

        {canView ? (
          <ScopedBrowser
            homePath={homePath}
            currentPath={selectedPath}
            onNavigate={onSelect}
          />
        ) : (
          <AccessRestricted attemptedPath={selectedPath} />
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Admin view — full tree + detail
  // -----------------------------------------------------------------------
  const node = findNode(FOLDER_TREE, selectedPath);
  const canView = isPathInScope(persona, selectedPath);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Browse
        </h1>
        <p className="mt-2 text-muted-foreground">
          Full administrator view of the Signode folder tree.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-2">
            <TreeNode
              node={FOLDER_TREE}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expanded={expanded}
              toggle={toggle}
              personaScopeCheck={scopeCheck}
            />
          </CardContent>
        </Card>

        {canView && node ? (
          <FolderDetail
            node={node}
            onNavigate={onSelect}
            showBreadcrumb={true}
          />
        ) : (
          <AccessRestricted attemptedPath={selectedPath} />
        )}
      </div>
    </div>
  );
}