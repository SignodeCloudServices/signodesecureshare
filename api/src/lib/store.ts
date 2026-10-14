// ---------------------------------------------------------------------------
// Invitation records — Azure Table Storage, via the managed identity
// (role: Storage Table Data Contributor on the account).
//
// A record is metadata for audit and revocation: who invited whom, into which
// scope, until when. It is NOT a credential. The Entra redemption URL is
// returned to the sponsor once and never stored.
//
// PartitionKey = target group ID (scope), RowKey = invitation ID.
// ---------------------------------------------------------------------------
import { TableClient, odata } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import { randomUUID } from "node:crypto";
import { config } from "./config";

export type InvitationStatus = "pending" | "redeemed" | "expired" | "revoked";

export type Invitation = {
  id: string;
  groupId: string;
  scopePath: string;
  inviteeEmail: string;
  inviteeUserId: string;
  inviterOid: string;
  inviterUpn: string;
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
  /** Set when status leaves "pending"/"redeemed". */
  closedAt?: string;
  closedBy?: string;
};

type Entity = Omit<Invitation, "id" | "groupId"> & { partitionKey: string; rowKey: string };

let client: TableClient | undefined;
function table(): TableClient {
  const cfg = config();
  return (client ??= new TableClient(cfg.tableUrl, cfg.tableName, new DefaultAzureCredential()));
}

const toInvitation = (e: Entity): Invitation => {
  const { partitionKey, rowKey, ...rest } = e;
  return {
    id: rowKey,
    groupId: partitionKey,
    scopePath: rest.scopePath,
    inviteeEmail: rest.inviteeEmail,
    inviteeUserId: rest.inviteeUserId,
    inviterOid: rest.inviterOid,
    inviterUpn: rest.inviterUpn,
    createdAt: rest.createdAt,
    expiresAt: rest.expiresAt,
    status: rest.status,
    ...(rest.closedAt ? { closedAt: rest.closedAt } : {}),
    ...(rest.closedBy ? { closedBy: rest.closedBy } : {}),
  };
};

export async function createInvitation(i: Omit<Invitation, "id">): Promise<Invitation> {
  const id = randomUUID();
  const { groupId, ...rest } = i;
  await table().createEntity<Entity>({ partitionKey: groupId, rowKey: id, ...rest });
  return { id, ...i };
}

export async function getInvitation(id: string): Promise<Invitation | undefined> {
  for await (const e of table().listEntities<Entity>({ queryOptions: { filter: odata`RowKey eq ${id}` } })) {
    return toInvitation(e);
  }
  return undefined;
}

/** All records, optionally only those in the given scopes. */
export async function listInvitations(groupIds?: string[]): Promise<Invitation[]> {
  const out: Invitation[] = [];
  for await (const e of table().listEntities<Entity>()) {
    if (!groupIds || groupIds.includes(e.partitionKey)) out.push(toInvitation(e));
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Records still able to grant access: pending or redeemed. */
export async function listOpenInvitations(): Promise<Invitation[]> {
  const out: Invitation[] = [];
  const filter = odata`status eq ${"pending"} or status eq ${"redeemed"}`;
  for await (const e of table().listEntities<Entity>({ queryOptions: { filter } })) out.push(toInvitation(e));
  return out;
}

export async function updateStatus(i: Invitation, status: InvitationStatus, by: string): Promise<void> {
  const closing = status === "expired" || status === "revoked";
  await table().updateEntity(
    {
      partitionKey: i.groupId,
      rowKey: i.id,
      status,
      ...(closing ? { closedAt: new Date().toISOString(), closedBy: by } : {}),
    },
    "Merge",
  );
}
