// ---------------------------------------------------------------------------
// Live upload — real files, real SharePoint, scoped destinations
//
// The destination list is built from the signed-in user's own scope and the
// folders Graph returns beneath it. A user never sees a destination outside
// their scope, and never sees the shape of the wider tree.
//
// This is presentation. SharePoint is the control: an upload aimed at a
// folder the user cannot write to is rejected by Graph with a 403, whatever
// this component offers.
// ---------------------------------------------------------------------------

import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "@/lib/auth-context";
import {
  listFolderPaths,
  uploadFile,
  SIMPLE_UPLOAD_LIMIT,
} from "@/lib/graph";
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
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Ratified retention period (RB-16).
 *
 * NOTE: src/lib/retention.ts was prepared in an earlier session but never
 * committed, so this is inlined. Several pages still say "expire after 7
 * days", which contradicts the ratified 90-day decision - worth fixing
 * together rather than piecemeal.
 */
const FILE_RETENTION_DAYS = 90;

type QueuedFile = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  message?: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Show the destination relative to the user's own root, not the full path. */
function relativeLabel(path: string, rootPath: string): string {
  if (path === rootPath) return path.split("/").pop() ?? path;
  if (path.startsWith(rootPath + "/")) {
    const rootName = rootPath.split("/").pop() ?? "";
    return `${rootName}/${path.slice(rootPath.length + 1)}`;
  }
  return path;
}

export function LiveUpload() {
  const { instance } = useMsal();
  const { account, scopedPaths, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [destinations, setDestinations] = React.useState<string[]>([]);
  const [destination, setDestination] = React.useState("");
  const [files, setFiles] = React.useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [loadingDests, setLoadingDests] = React.useState(false);

  const rootPath = scopedPaths[0] ?? "";

  // Build the destination list from the user's scope only.
  React.useEffect(() => {
    if (!account || scopedPaths.length === 0) return;
    if (scopedPaths.includes("*") && !isAdmin) return;

    let cancelled = false;
    setLoadingDests(true);

    (async () => {
      const roots = scopedPaths.includes("*") ? [] : scopedPaths;
      const all: string[] = [];
      for (const root of roots) {
        const paths = await listFolderPaths(instance, account, root);
        all.push(...paths);
      }
      if (cancelled) return;
      setDestinations(all);
      if (all.length > 0) setDestination(all[0]);
      setLoadingDests(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [instance, account, scopedPaths, isAdmin]);

  function addFiles(list: FileList | File[]) {
    const queued: QueuedFile[] = Array.from(list).map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: f.size > SIMPLE_UPLOAD_LIMIT ? "error" : "queued",
      message:
        f.size > SIMPLE_UPLOAD_LIMIT
          ? `Too large (${humanSize(f.size)}). Limit is ${humanSize(SIMPLE_UPLOAD_LIMIT)}.`
          : undefined,
    }));
    setFiles((prev) => [...prev, ...queued]);
  }

  async function uploadAll() {
    if (!account || !destination) return;

    for (const qf of files.filter((f) => f.status === "queued")) {
      setFiles((prev) =>
        prev.map((f) => (f.id === qf.id ? { ...f, status: "uploading" } : f))
      );
      try {
        await uploadFile(instance, account, destination, qf.file);
        setFiles((prev) =>
          prev.map((f) => (f.id === qf.id ? { ...f, status: "done" } : f))
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === qf.id ? { ...f, status: "error", message } : f
          )
        );
        toast({
          title: `Upload failed: ${qf.file.name}`,
          description: message.slice(0, 200),
          variant: "destructive",
        });
      }
    }
  }

  const pending = files.filter((f) => f.status === "queued").length;

  if (authLoading || loadingDests) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your folders…
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--signode-orange))]" />
          <h2 className="mt-3 text-lg font-semibold">No upload destinations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has no folders you can upload to. Contact{" "}
            <code>itservicecenter@signode.com</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <label className="text-sm font-medium">Destination folder:</label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-[420px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((p) => (
                <SelectItem key={p} value={p}>
                  {relativeLabel(p, rootPath)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            Retained {FILE_RETENTION_DAYS} days
          </Badge>
        </CardContent>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={[
          "rounded-lg border-2 border-dashed p-10 text-center transition",
          isDragging
            ? "border-[hsl(var(--signode-orange))] bg-orange-50/50"
            : "border-muted",
        ].join(" ")}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Drag files here, or{" "}
          <label className="cursor-pointer font-medium text-[hsl(var(--signode-orange))] underline">
            browse
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Maximum {humanSize(SIMPLE_UPLOAD_LIMIT)} per file.
        </p>
      </div>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Upload queue ({files.length})
              </span>
              {pending > 0 && (
                <Button size="sm" onClick={uploadAll}>
                  Upload {pending} file{pending === 1 ? "" : "s"}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded border p-3 text-sm"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {humanSize(f.file.size)}
                      {f.message && (
                        <span className="text-red-600"> · {f.message}</span>
                      )}
                    </div>
                  </div>
                  {f.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {f.status === "done" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  {f.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {f.status === "queued" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFiles((prev) => prev.filter((x) => x.id !== f.id))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
