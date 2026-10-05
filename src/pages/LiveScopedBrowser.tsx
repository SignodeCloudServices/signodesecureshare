// ---------------------------------------------------------------------------
// Scoped browser — live SharePoint content via Microsoft Graph
//
// Opens at the user's own folder and goes no higher. There is no tree, no
// sibling list, and no indication of what exists elsewhere in the library.
//
// Two layers decide what appears here:
//   1. This component only ever requests paths at or below the user's scope.
//   2. Graph returns only what the user's SharePoint ACLs permit.
//
// The second is the real control. If this component asked for a folder the
// user cannot see, Graph would return 403 and they would see an error — not
// someone else's files.
// ---------------------------------------------------------------------------

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "@/lib/auth-context";
import { listChildren, getDownloadUrl, type DriveItem } from "@/lib/graph";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // The user's own folder. Everything below is relative to this.
  const rootPath = scopedPaths[0] ?? "";

  const [path, setPath] = React.useState<string>(rootPath);
  const [items, setItems] = React.useState<DriveItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // scopedPaths arrives asynchronously after sign-in.
  React.useEffect(() => {
    if (rootPath && !path) setPath(rootPath);
  }, [rootPath, path]);

  React.useEffect(() => {
    if (!account || !path) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    listChildren(instance, account, path)
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
  }, [instance, account, path]);

  async function handleDownload(item: DriveItem) {
    if (!account) return;
    try {
      const url =
        item.downloadUrl ?? (await getDownloadUrl(instance, account, `${path}/${item.name}`));
      window.open(url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Breadcrumb relative to the user's root — never shows anything above it.
  const relativeParts = path.startsWith(rootPath)
    ? path.slice(rootPath.length).split("/").filter(Boolean)
    : [];

  const rootLabel = rootPath.split("/").pop() ?? "Your folder";
  const canGoUp = relativeParts.length > 0;

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Resolving your access…
      </div>
    );
  }

  if (!rootPath) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--signode-orange))]" />
          <h2 className="mt-3 text-lg font-semibold">No folders assigned</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has no SecureShare folders assigned yet. Contact{" "}
            <code>itservicecenter@signode.com</code> to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb — relative to the user's own folder */}
      <div className="flex items-center gap-2 text-sm">
        {canGoUp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPath(path.split("/").slice(0, -1).join("/"))}
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
                      item.isFolder && setPath(`${path}/${item.name}`)
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
