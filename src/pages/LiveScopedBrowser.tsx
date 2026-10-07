// ---------------------------------------------------------------------------
// Scoped browser — live SharePoint content via Microsoft Graph
//
// Opens at one of the user's granted folders and goes no higher within it.
// There is no tree, no sibling list, and no indication of what exists
// elsewhere in the library.
//
// A user may hold several unrelated grants (AMER/Engineering and CORP/Legal,
// say). Those are not one tree and have no common ancestor the user is
// allowed to see, so they cannot be browsed as one. Instead each granted root
// is a separate scope and the picker switches between them. The picker only
// appears when there is more than one.
//
// Two layers decide what appears here:
//   1. This component only ever requests paths at or below a granted scope.
//   2. Graph returns only what the user's SharePoint ACLs permit.
//
// The second is the real control. If this component asked for a folder the
// user cannot see, Graph would return 403 and they would see an error — not
// someone else's files. The picker is therefore a navigation affordance, not
// a permission boundary: adding an entry to it grants nothing.
// ---------------------------------------------------------------------------

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "@/lib/auth-context";
import { listChildren, getDownloadUrl, type DriveItem } from "@/lib/graph";
import { PORTAL_ROOT, rootScopePaths, scopeLabel } from "@/lib/folder-scopes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FileText,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function LiveScopedBrowser() {
  const { instance } = useMsal();
  const { account, scopedPaths, isLoading: authLoading } = useAuth();

  // The roots this user may browse.
  //
  // An admin resolves to "*", which is not a path — root them at the library
  // top instead so they browse the real tree rather than a static mock.
  const scopeRoots = React.useMemo(
    () =>
      scopedPaths.includes("*") ? [PORTAL_ROOT] : rootScopePaths(scopedPaths),
    [scopedPaths]
  );

  const [activeRoot, setActiveRoot] = React.useState<string>("");
  const [path, setPath] = React.useState<string>("");
  const [items, setItems] = React.useState<DriveItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // scopedPaths arrives asynchronously after sign-in, so activeRoot is empty
  // for the first render or two. Derive rather than sync through an effect:
  // an effect would render one frame of "no folders assigned" first.
  const rootPath = scopeRoots.includes(activeRoot)
    ? activeRoot
    : (scopeRoots[0] ?? "");

  // Likewise for path, which also must never survive a scope switch pointing
  // into the scope the user just left.
  const currentPath =
    path === rootPath || path.startsWith(`${rootPath}/`) ? path : rootPath;

  function handleScopeChange(next: string) {
    setActiveRoot(next);
    setPath(next);
    setItems([]);
    setError(null);
  }

  React.useEffect(() => {
    if (!account || !currentPath) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    listChildren(instance, account, currentPath)
      .then((result) => {
        if (cancelled) return;
        // Folders first, then alphabetical.
        result.sort((a, b) =>
          a.isFolder === b.isFolder
            ? a.name.localeCompare(b.name)
            : a.isFolder
              ? -1
              : 1
        );
        setItems(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [instance, account, currentPath]);

  async function handleDownload(item: DriveItem) {
    if (!account) return;
    try {
      const url =
        item.downloadUrl ??
        (await getDownloadUrl(instance, account, `${currentPath}/${item.name}`));
      window.open(url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Breadcrumb relative to the active root — never shows anything above it.
  const relativeParts = currentPath
    .slice(rootPath.length)
    .split("/")
    .filter(Boolean);

  const rootLabel = scopeLabel(rootPath);
  const canGoUp = relativeParts.length > 0;

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Resolving your access…
      </div>
    );
  }

  if (scopeRoots.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--signode-orange))]" />
          <h2 className="mt-3 text-lg font-semibold">No folders assigned</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has no SecureShare folders assigned yet. Contact your
            internal Signode Support Contact to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scope picker — only when the user actually holds more than one grant.
          A single-scope user (the common case, and every external guest) sees
          no control at all and no hint that others exist. */}
      {scopeRoots.length > 1 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <label className="text-sm font-medium" htmlFor="scope-picker">
              Department:
            </label>
            <Select value={rootPath} onValueChange={handleScopeChange}>
              <SelectTrigger id="scope-picker" className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeRoots.map((root) => (
                  <SelectItem key={root} value={root}>
                    {scopeLabel(root)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              You have access to {scopeRoots.length} areas.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Breadcrumb — relative to the active root */}
      <div className="flex items-center gap-2 text-sm">
        {canGoUp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setPath(currentPath.split("/").slice(0, -1).join("/"))
            }
          >
            <ArrowLeft className="mr-1 h-3 w-3" /> Back
          </Button>
        )}
        <span className="font-medium">{rootLabel}</span>
        {relativeParts.map((part, i) => (
          <React.Fragment key={i}>
            <span className="text-muted-foreground">/</span>
            <span className={i === relativeParts.length - 1 ? "font-medium" : ""}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Could not load this folder.</strong>
                <p className="mt-1 font-mono text-xs break-all">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 && !error ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Inbox className="mx-auto h-8 w-8" />
            <p className="mt-3">This folder is empty.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() =>
                      item.isFolder && setPath(`${currentPath}/${item.name}`)
                    }
                    disabled={!item.isFolder}
                  >
                    {item.isFolder ? (
                      <Folder className="h-4 w-4 shrink-0 text-[hsl(var(--signode-orange))]" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">{item.name}</span>
                    {item.isFolder && item.childCount !== undefined && (
                      <Badge variant="secondary" className="shrink-0">
                        {item.childCount}
                      </Badge>
                    )}
                  </button>

                  <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
                    {!item.isFolder && <span>{formatSize(item.size)}</span>}
                    <span>{formatWhen(item.lastModifiedDateTime)}</span>
                    {!item.isFolder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(item)}
                        aria-label={`Download ${item.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
