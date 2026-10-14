// ---------------------------------------------------------------------------
// Invitations — sponsors and admins invite partners and revoke access (WS3).
//
// Live mode only, and only in builds with VITE_INVITATIONS_ENABLED=true.
// Everything here is presentation: the API decides who may invite, into which
// scope, for how long, and whom (api/src/lib/checks.ts). The scope picker is
// filled from the API's own answer, so it offers exactly what the server will
// accept — never the seeded folder tree the old mock dialog used.
// ---------------------------------------------------------------------------
import * as React from "react";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  createInvitation,
  listInvitations,
  revokeInvitation,
  useSponsorScopes,
  type Invitation,
  type InvitationStatus,
} from "@/lib/invitations-api";
import { scopeLabel } from "@/lib/folder-scopes";
import { INVITATION_DEFAULT_DAYS, INVITATION_MAX_DAYS } from "@/lib/retention";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Loader2, MailPlus, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<InvitationStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  redeemed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  expired: "bg-slate-100 text-slate-700 border-slate-300",
  revoked: "bg-red-100 text-red-900 border-red-300",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function InvitationsPage() {
  const { instance } = useMsal();
  const { account, isAdmin } = useAuth();
  const { toast } = useToast();
  const { scopes, loading: scopesLoading, error: scopesError } = useSponsorScopes();

  const [items, setItems] = React.useState<Invitation[]>([]);
  const [listLoading, setListLoading] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [days, setDays] = React.useState(INVITATION_DEFAULT_DAYS);
  const [submitting, setSubmitting] = React.useState(false);
  const [lastRedeemUrl, setLastRedeemUrl] = React.useState<{ email: string; url: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!account) return;
    setListLoading(true);
    setListError(null);
    try {
      setItems(await listInvitations(instance, account));
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setListLoading(false);
    }
  }, [account, instance]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Preselect when there is only one scope to choose from.
  React.useEffect(() => {
    if (!groupId && scopes.length === 1) setGroupId(scopes[0]!.groupId);
  }, [scopes, groupId]);

  const daysValid = Number.isInteger(days) && days >= 1 && days <= INVITATION_MAX_DAYS;
  const canSubmit = !!account && !!groupId && email.trim().length > 3 && daysValid && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !canSubmit) return;
    setSubmitting(true);
    try {
      const r = await createInvitation(instance, account, { email: email.trim(), groupId, days });
      setLastRedeemUrl({ email: r.invitation.inviteeEmail, url: r.redeemUrl });
      setEmail("");
      setDays(INVITATION_DEFAULT_DAYS);
      toast({ title: "Invitation sent", description: `${r.invitation.inviteeEmail} — ${scopeLabel(r.invitation.scopePath)}` });
      void refresh();
    } catch (err) {
      toast({
        title: err instanceof ApiError && err.status === 403 ? "Not allowed" : "Invitation failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevoke(inv: Invitation) {
    if (!account) return;
    if (confirmRevoke !== inv.id) {
      setConfirmRevoke(inv.id);
      return;
    }
    setConfirmRevoke(null);
    try {
      await revokeInvitation(instance, account, inv.id);
      toast({ title: "Access revoked", description: `${inv.inviteeEmail} — ${scopeLabel(inv.scopePath)}` });
      void refresh();
    } catch (err) {
      toast({ title: "Revoke failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  }

  const noScopes = !scopesLoading && !scopesError && scopes.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">Invitations</h1>
        <p className="mt-2 text-muted-foreground">
          Invite a partner to one external folder you sponsor. Microsoft sends the invitation; the
          partner signs in with their own organization&rsquo;s account. The link must be accepted
          within the number of days you choose (default {INVITATION_DEFAULT_DAYS}, at most{" "}
          {INVITATION_MAX_DAYS}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MailPlus className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            New invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scopesLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking which folders you sponsor…
            </div>
          )}
          {scopesError && <p className="text-sm text-red-700">Could not load your folders: {scopesError}</p>}
          {noScopes && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              You are not a sponsor (owner) of any external folder, so you cannot invite partners.
              Contact your internal Signode Support Contact if you need to be added.
            </div>
          )}
          {scopes.length > 0 && (
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[2fr_2fr_1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">Partner email</Label>
                <Input
                  id="inv-email"
                  type="email"
                  autoComplete="off"
                  placeholder="name@partner.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Folder</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopes.map((s) => (
                      <SelectItem key={s.groupId} value={s.groupId}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-days">Accept within (days)</Label>
                <Input
                  id="inv-days"
                  type="number"
                  min={1}
                  max={INVITATION_MAX_DAYS}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </div>
              <Button type="submit" disabled={!canSubmit} className="bg-[hsl(var(--signode-orange))] hover:bg-[hsl(var(--signode-orange))]/90">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
              </Button>
            </form>
          )}

          {lastRedeemUrl && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              {/* Shown once, never stored: the invitation mail has landed in spam
                  in testing, so the sponsor can pass the link on directly. */}
              <div className="font-medium">Invitation link for {lastRedeemUrl.email}</div>
              <p className="text-muted-foreground mt-1">
                Microsoft has emailed this link. If it does not arrive, send it to the partner
                yourself. It works only for that email address and is not shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs">{lastRedeemUrl.url}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastRedeemUrl.url);
                    toast({ title: "Link copied" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isAdmin ? "All invitations" : "Invitations for your folders"}</CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading && items.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {listError && <p className="text-sm text-red-700">Could not load invitations: {listError}</p>}
          {!listLoading && !listError && items.length === 0 && (
            <p className="text-sm text-muted-foreground">No invitations yet.</p>
          )}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Accept by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => {
                  const open = inv.status === "pending" || inv.status === "redeemed";
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.inviteeEmail}</TableCell>
                      <TableCell>{scopeLabel(inv.scopePath)}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.inviterUpn}</TableCell>
                      <TableCell>{fmt(inv.createdAt)}</TableCell>
                      <TableCell>{fmt(inv.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLE[inv.status]}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {open && (
                          <Button
                            size="sm"
                            variant={confirmRevoke === inv.id ? "destructive" : "outline"}
                            onClick={() => void onRevoke(inv)}
                            onBlur={() => setConfirmRevoke((c) => (c === inv.id ? null : c))}
                          >
                            {confirmRevoke === inv.id ? "Confirm revoke" : "Revoke"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
