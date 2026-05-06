import "server-only";

import { AccountClient, Errors, Models } from "postmark";

export class PostmarkError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(opts: { message: string; code: number; httpStatus: number }) {
    super(opts.message);
    this.name = "PostmarkError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}

export type PostmarkServer = {
  id: number;
  name: string;
  apiToken: string;
  smtpApiActivated: boolean;
};

export type PostmarkDomain = {
  id: number;
  name: string;
  dkimHost: string;
  dkimValue: string;
  dkimVerified: boolean;
  returnPathHost: string;
  returnPathCnameValue: string;
  returnPathVerified: boolean;
};

export type PostmarkAccountClient = ReturnType<
  typeof createPostmarkAccountClient
>;

export function createPostmarkAccountClient(accountToken: string) {
  if (!accountToken) {
    throw new PostmarkError({
      message: "Missing Postmark account token",
      code: 0,
      httpStatus: 0,
    });
  }

  const client = new AccountClient(accountToken);

  async function createServer(customerId: string): Promise<PostmarkServer> {
    try {
      const server = await client.createServer({
        Name: `mailkit-${customerId}`,
        Color: "Blue",
        SmtpApiActivated: true,
        RawEmailEnabled: false,
        DeliveryType: Models.ServerDeliveryTypes.Live,
      });
      return {
        id: server.ID,
        name: server.Name,
        apiToken: server.ApiTokens?.[0] ?? "",
        smtpApiActivated: server.SmtpApiActivated ?? true,
      };
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function getServer(serverId: number): Promise<PostmarkServer> {
    try {
      const server = await client.getServer(serverId);
      return {
        id: server.ID,
        name: server.Name,
        apiToken: server.ApiTokens?.[0] ?? "",
        smtpApiActivated: server.SmtpApiActivated ?? true,
      };
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function suspendServer(serverId: number): Promise<void> {
    try {
      await client.editServer(serverId, { SmtpApiActivated: false });
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function resumeServer(serverId: number): Promise<void> {
    try {
      await client.editServer(serverId, { SmtpApiActivated: true });
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function deleteServer(serverId: number): Promise<void> {
    try {
      await client.deleteServer(serverId);
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function addSenderDomain(domainName: string): Promise<PostmarkDomain> {
    try {
      const domain = await client.createDomain({ Name: domainName });
      return normalizeDomain(domain);
    } catch (e) {
      if (isDuplicateDomain(e)) {
        const list = await client.getDomains({ count: 500, offset: 0 });
        const existing = list.Domains?.find(
          (d: Models.Domain) =>
            d.Name.toLowerCase() === domainName.toLowerCase(),
        );
        if (existing) {
          const detail = await client.getDomain(existing.ID);
          return normalizeDomain(detail);
        }
      }
      throw toPostmarkError(e);
    }
  }

  async function getDomain(domainId: number): Promise<PostmarkDomain> {
    try {
      const domain = await client.getDomain(domainId);
      return normalizeDomain(domain);
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function verifyDkim(domainId: number): Promise<PostmarkDomain> {
    try {
      const domain = await client.verifyDomainDKIM(domainId);
      return normalizeDomain(domain);
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  async function deleteDomain(domainId: number): Promise<void> {
    try {
      await client.deleteDomain(domainId);
    } catch (e) {
      throw toPostmarkError(e);
    }
  }

  return {
    createServer,
    getServer,
    suspendServer,
    resumeServer,
    deleteServer,
    addSenderDomain,
    getDomain,
    verifyDkim,
    deleteDomain,
  };
}

function normalizeDomain(domain: Models.DomainDetails): PostmarkDomain {
  return {
    id: domain.ID,
    name: domain.Name,
    dkimHost: domain.DKIMHost ?? "",
    dkimValue: domain.DKIMTextValue ?? "",
    dkimVerified: !!domain.DKIMVerified,
    returnPathHost:
      domain.ReturnPathDomain ?? `pm-bounces.${domain.Name ?? ""}`,
    returnPathCnameValue: domain.ReturnPathDomainCNAMEValue ?? "pm.mtasv.net",
    returnPathVerified: !!domain.ReturnPathDomainVerified,
  };
}

function isDuplicateDomain(e: unknown): boolean {
  if (e instanceof Errors.PostmarkError) {
    if (e.code === 501) return true;
  }
  if (e instanceof Error) {
    return /already exists/i.test(e.message);
  }
  return false;
}

function toPostmarkError(e: unknown): PostmarkError {
  if (e instanceof Errors.PostmarkError) {
    return new PostmarkError({
      message: e.message,
      code: e.code ?? 0,
      httpStatus: e.statusCode ?? 0,
    });
  }
  if (e instanceof PostmarkError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new PostmarkError({ message, code: 0, httpStatus: 0 });
}
