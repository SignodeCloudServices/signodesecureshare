import * as React from "react";
import { usePersona } from "@/lib/persona-context";
import { useAuth, DEMO_MODE } from "@/lib/auth-context";
import { LiveUpload } from "./LiveUpload";
import { isPathInScope } from "@/lib/personas";
import { flattenTree, FOLDER_TREE } from "@/lib/folderTree";
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
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PendingFile = {
  id: string;
  name: string;
  size: number;
  status: "queued" | "uploading" | "done";
  progress: number;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Live mode uses LiveUpload, whose destination list is built from the user's
 * own scope. The mock implementation below is the demo-mode experience; it
 * reads folderTree.ts, which is demo data and shows the entire tree.
 */
export function UploadPage() {
  const { isAuthenticated } = useAuth();

  if (!DEMO_MODE) {
    if (!isAuthenticated) return null;
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Upload
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drag and drop files below.
        </p>
        <div className="mt-6">
          <LiveUpload />
        </div>
      </div>
    );
  }

  return <UploadPageInner />;
}

function UploadPageInner() {
  const { persona } = usePersona();
  const { toast } = useToast();
  const [destination, setDestination] = React.useState("");
  const [files, setFiles] = React.useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  const allowedFolders = flattenTree(FOLDER_TREE).filter((n) =>
    isPathInScope(persona, n.path)
  );

  React.useEffect(() => {
    if (!destination && allowedFolders.length > 0) {
      setDestination(allowedFolders[0].path);
    }
  }, [allowedFolders, destination]);

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    const mapped: PendingFile[] = arr.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      status: "queued",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...mapped]);
    // Simulate upload progress
    mapped.forEach((mf) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((p) =>
            p.id === mf.id ? { ...p, status: "uploading", progress: 40 } : p
          )
        );
      }, 300);
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((p) =>
            p.id === mf.id ? { ...p, status: "uploading", progress: 80 } : p
          )
        );
      }, 900);
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((p) =>
            p.id === mf.id ? { ...p, status: "done", progress: 100 } : p
          )
        );
        toast({
          title: "Upload complete",
          description: `${mf.name} uploaded to ${destination}`,
        });
      }, 1500);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (!destination) {
      toast({
        variant: "destructive",
        title: "Choose a destination",
        description: "Select a folder before dropping files.",
      });
      return;
    }
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleBrowse(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Upload
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drag and drop files below. Uploads expire after 7 days by default.
        </p>
      </div>

      {/* Destination picker */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="text-sm font-medium">Destination folder:</div>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-[360px]">
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              {allowedFolders.map((f) => (
                <SelectItem key={f.path} value={f.path}>
                  {f.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
            Expires in 7d
          </Badge>
        </CardContent>
      </Card>

      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          isDragging
            ? "border-[hsl(var(--signode-orange))] bg-[hsl(var(--signode-orange))]/5"
            : "border-border bg-card hover:border-[hsl(var(--signode-orange))]/60",
        ].join(" ")}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleBrowse}
        />
        <div className="mx-auto h-14 w-14 rounded-full bg-[hsl(var(--signode-orange))]/10 flex items-center justify-center text-[hsl(var(--signode-orange))]">
          <Upload className="h-7 w-7" />
        </div>
        <div className="mt-4 font-semibold text-[hsl(var(--signode-black))]">
          Drop files here, or click to browse
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Files are DLP-scanned before landing in the destination folder.
        </div>
      </label>

      {/* Queue */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Upload queue ({files.length})
            </div>
            <div className="divide-y">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="py-3 flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={[
                          "h-full transition-all",
                          f.status === "done"
                            ? "bg-emerald-500"
                            : "bg-[hsl(var(--signode-orange))]",
                        ].join(" ")}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {humanSize(f.size)} &middot;{" "}
                      {f.status === "queued" && "Queued"}
                      {f.status === "uploading" && `Uploading ${f.progress}%`}
                      {f.status === "done" && "Uploaded — expires in 7d"}
                    </div>
                  </div>
                  {f.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(f.id)}
                      className="h-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}