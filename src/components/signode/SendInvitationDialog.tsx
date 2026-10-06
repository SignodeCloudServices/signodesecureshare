import * as React from "react";
import { usePersona } from "@/lib/persona-context";
import { canSendInvitations } from "@/lib/personas";
import {
  INVITATION_DEFAULT_DAYS,
  INVITATION_MAX_DAYS,
} from "@/lib/retention";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Copy, Check } from "lucide-react";
import { flattenTree, FOLDER_TREE } from "@/lib/folderTree";
import { isPathInScope } from "@/lib/personas";
import { useToast } from "@/hooks/use-toast";

export function SendInvitationDialog() {
  const { persona } = usePersona();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [folder, setFolder] = React.useState("");
  const [expires, setExpires] = React.useState(String(INVITATION_DEFAULT_DAYS));
  const [note, setNote] = React.useState("");
  const [sentLink, setSentLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Only internal personas can send invitations
  if (!canSendInvitations(persona)) return null;

  const allowedFolders = flattenTree(FOLDER_TREE).filter((n) =>
    isPathInScope(persona, n.path)
  );

  function handleSend() {
    if (!email || !folder) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter an email and select a folder.",
      });
      return;
    }
    const token = Math.random().toString(36).substring(2, 10);
    const link = `https://secureshare.pkgconnect.com/invite/${token}`;
    setSentLink(link);
    toast({
      title: "Invitation sent",
      description: `A secure link was sent to ${email}.`,
    });
  }

  function handleCopy() {
    if (sentLink) {
      navigator.clipboard.writeText(sentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setEmail("");
      setFolder("");
      setExpires("7");
      setNote("");
      setSentLink(null);
      setCopied(false);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-[hsl(var(--signode-orange))] hover:bg-[hsl(var(--signode-orange-deep))] text-white gap-2"
          size="sm"
        >
          <Send className="h-4 w-4" />
          Send Invitation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sentLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation ready</DialogTitle>
              <DialogDescription>
                Share this secure link with the recipient. It will expire in{" "}
                {expires} days.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted/40 p-3 flex items-center gap-2">
              <code className="text-xs flex-1 break-all">{sentLink}</code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Invitation</DialogTitle>
              <DialogDescription>
                Invite an external party to access a specific folder in your
                scope.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Recipient email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="vendor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-folder">Folder to share</Label>
                <Select value={folder} onValueChange={setFolder}>
                  <SelectTrigger id="invite-folder">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-expires">Link expires in (days)</Label>
                <Input
                  id="invite-expires"
                  type="number"
                  min={1}
                  max={INVITATION_MAX_DAYS}
                  value={expires}
                  onChange={(e) => setExpires(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-note">Personal note (optional)</Label>
                <Textarea
                  id="invite-note"
                  placeholder="Add context for the recipient..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                className="bg-[hsl(var(--signode-orange))] hover:bg-[hsl(var(--signode-orange-deep))] text-white"
              >
                Generate secure link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}