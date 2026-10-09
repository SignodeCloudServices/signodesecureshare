// ---------------------------------------------------------------------------
// Send Invitation — DEMO MODE ONLY. Renders nothing in live mode.
//
// Hidden from the live portal on 9 Oct 2026. This dialog is scaffolding from
// the original mock build and it misrepresents the system in four ways:
//
//   1. It reads the persona switcher (`usePersona`), not the signed-in Entra
//      identity, so "who may invite" is answered by demo machinery.
//   2. Its folder list comes from `folderTree.ts` — seeded data whose shape no
//      longer matches SharePoint. Mock data in live mode, against the standing
//      rule in CLAUDE.md.
//   3. It ignores `guestEligibleScopes()` entirely, so it would offer internal
//      department folders as invitation targets — bypassing the one guard
//      built to prevent over-granting an internal folder to a partner.
//   4. The token is `Math.random()` and no mail is sent, while the UI says a
//      link was delivered.
//
// (3) is the serious one: it inverts the control rather than merely faking it.
//
// The real flow does not belong here at all. Invitation is an app-only
// operation (create a B2B guest, write group membership) and app-only
// permissions are inert on a public client, so it cannot be built in the SPA —
// it needs the Functions API. See RB-31 for the build sequence. When that
// lands, this component is deleted rather than fixed.
// ---------------------------------------------------------------------------

import * as React from "react";
import { usePersona } from "@/lib/persona-context";
import { canSendInvitations } from "@/lib/personas";
import { DEMO_MODE } from "@/lib/auth-context";
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

function DemoSendInvitationDialog() {
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
    // Say "simulated" rather than "sent". Nothing is emailed, and the demo
    // sign-in gate labels its simulated steps the same way.
    toast({
      title: "Invitation link generated (simulated)",
      description: `No mail was sent. In the live flow Entra invites ${email}.`,
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
      setExpires(String(INVITATION_DEFAULT_DAYS));
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
              <DialogTitle>Invitation ready (illustrative)</DialogTitle>
              <DialogDescription>
                Placeholder link, not a working invitation. In the live flow
                Entra issues and validates the redemption link, with a{" "}
                {expires}-day window.
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

/**
 * Live mode renders nothing at all — no button, so nothing to click by
 * accident while an admin is presenting.
 *
 * Gated here rather than at the call site in `SignodeHeader` so the guard
 * travels with the component: any future call site inherits it instead of
 * having to remember. Same split-at-the-boundary shape as `SignInGate`, which
 * keeps the hook order unconditional.
 */
export function SendInvitationDialog() {
  return DEMO_MODE ? <DemoSendInvitationDialog /> : null;
}