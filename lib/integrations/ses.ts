import "server-only";

import crypto from "crypto";

import {
  SESv2Client,
  CreateTenantCommand,
  DeleteTenantCommand,
  CreateEmailIdentityCommand,
  CreateTenantResourceAssociationCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import {
  IAMClient,
  CreateUserCommand,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
  DeleteUserCommand,
  PutUserPolicyCommand,
  ListAccessKeysCommand,
} from "@aws-sdk/client-iam";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

/**
 * AWS SES v2 integration — replaces lib/integrations/brevo.ts.
 *
 * Architecture: MailKit owns ONE AWS account. Each customer domain is
 * a verified SES email identity under a per-customer Tenant. Each
 * tenant gets its own IAM user scoped to ses:SendRawEmail for that
 * domain ARN — leaked SMTP credentials can only send from the owner's
 * domain, not any other customer's.
 *
 * Tenant Management is an SES v2 feature (GA August 2024) that groups
 * identities and isolates deliverability reputation per customer.
 * All Tenant APIs use TenantName (not TenantId) as the identifier.
 *
 * Region: us-east-1 (primary). DR region us-west-2 is incident runbook
 * Phase 2 Scenario A — not wired here.
 */

export const SES_REGION = process.env.AWS_SES_REGION ?? "us-east-1";
export const SES_SMTP_HOST = `email-smtp.${SES_REGION}.amazonaws.com`;
export const SES_SMTP_PORT = 587;
export const SES_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID ?? "";

/** Status values written to setup_runs.status during the SES pipeline. */
export const SES_STATUS = {
  tenantCreated: "ses_tenant_created",
  identityCreated: "ses_identity_created",
  dkimPending: "ses_dkim_pending",
  identityVerified: "ses_identity_verified",
  credentialsIssued: "ses_credentials_issued",
  done: "ses_done",
} as const;

export type SesStatus = (typeof SES_STATUS)[keyof typeof SES_STATUS];

export class SesError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(opts: { message: string; code: string; cause?: unknown }) {
    super(opts.message);
    this.name = "SesError";
    this.code = opts.code;
    this.cause = opts.cause;
  }
}

export type SesDnsRecord = {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
};

export type SesDomainIdentity = {
  identityArn: string;
  tenantName: string;
  dnsRecords: SesDnsRecord[];
  verificationStatus: "PENDING" | "SUCCESS" | "FAILED" | "TEMPORARY_FAILURE";
};

export type SesSmtpCredentials = {
  host: string;
  port: number;
  username: string;
  password: string;
  securityMode: "starttls";
  iamUsername: string;
  iamAccessKeyId: string;
};

function makeCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new SesError({
      message: "AWS credentials not configured",
      code: "missing_aws_credentials",
    });
  }
  return { accessKeyId, secretAccessKey };
}

function makeSesClient(): SESv2Client {
  return new SESv2Client({
    region: SES_REGION,
    credentials: makeCredentials(),
  });
}

function makeIamClient(): IAMClient {
  return new IAMClient({
    region: "us-east-1",
    credentials: makeCredentials(),
  });
}

function makeCloudWatchClient(): CloudWatchClient {
  return new CloudWatchClient({
    region: SES_REGION,
    credentials: makeCredentials(),
  });
}

/** Build the tenant name from a customer ID. Stable, human-readable. */
function tenantNameFor(customerId: string): string {
  return `mailkit-${customerId}`;
}

/** Build the IAM username for a customer's SMTP user. */
function iamUsernameFor(customerId: string): string {
  return `mailkit-tenant-${customerId}`;
}

/**
 * Create a SES Tenant for a customer.
 * Returns the tenantName — used as the identifier in all subsequent
 * Tenant API calls (AWS SES tenant APIs are TenantName-keyed).
 */
export async function createTenant(customerId: string): Promise<string> {
  const client = makeSesClient();
  const name = tenantNameFor(customerId);

  try {
    await client.send(new CreateTenantCommand({ TenantName: name }));
    return name;
  } catch (e) {
    const isAlreadyExists =
      e instanceof Error &&
      (e.name === "AlreadyExistsException" ||
        e.message.toLowerCase().includes("already exists"));
    if (isAlreadyExists) return name; // idempotent
    throw new SesError({
      message: `Failed to create SES tenant for customer ${customerId}`,
      code: "ses_create_tenant_failed",
      cause: e,
    });
  }
}

/**
 * Delete a SES Tenant (cleanup on account deletion).
 * Silently succeeds if tenant not found.
 */
export async function deleteTenant(customerId: string): Promise<void> {
  const client = makeSesClient();
  try {
    await client.send(
      new DeleteTenantCommand({ TenantName: tenantNameFor(customerId) }),
    );
  } catch (e) {
    if (
      e instanceof Error &&
      (e.name === "NotFoundException" || e.message.includes("not found"))
    ) {
      return;
    }
    throw new SesError({
      message: `Failed to delete SES tenant for customer ${customerId}`,
      code: "ses_delete_tenant_failed",
      cause: e,
    });
  }
}

/**
 * Create a verified SES email identity for a customer's domain.
 * Uses Easy DKIM — SES generates 3 CNAME records that MailKit writes
 * to the customer's Cloudflare zone.
 *
 * Returns the identity ARN and DNS records to write via Cloudflare API.
 * Verification status starts as PENDING — poll pollDomainVerification()
 * until SUCCESS (typically 5–30 min after DNS propagation).
 */
export async function verifyDomainForTenant(
  customerId: string,
  domain: string,
): Promise<SesDomainIdentity> {
  const client = makeSesClient();
  const tenantName = tenantNameFor(customerId);
  const identityArn = `arn:aws:ses:${SES_REGION}:${SES_ACCOUNT_ID}:identity/${domain}`;

  try {
    const res = await client.send(
      new CreateEmailIdentityCommand({ EmailIdentity: domain }),
    );

    // Associate domain identity with customer's tenant.
    await client.send(
      new CreateTenantResourceAssociationCommand({
        TenantName: tenantName,
        ResourceArn: identityArn,
      }),
    );

    return {
      identityArn,
      tenantName,
      dnsRecords: extractDkimCnames(domain, res.DkimAttributes?.Tokens),
      verificationStatus: "PENDING",
    };
  } catch (e) {
    if (e instanceof SesError) throw e;
    const isAlreadyExists =
      e instanceof Error &&
      (e.name === "AlreadyExistsException" ||
        e.message.toLowerCase().includes("already exists"));
    if (isAlreadyExists) {
      return pollDomainVerification(customerId, domain);
    }
    throw new SesError({
      message: `Failed to create SES email identity for ${domain}`,
      code: "ses_create_identity_failed",
      cause: e,
    });
  }
}

/**
 * Poll SES for current DKIM verification status.
 * Call every 30s until verificationStatus === "SUCCESS".
 */
export async function pollDomainVerification(
  customerId: string,
  domain: string,
): Promise<SesDomainIdentity> {
  const client = makeSesClient();
  const tenantName = tenantNameFor(customerId);
  const identityArn = `arn:aws:ses:${SES_REGION}:${SES_ACCOUNT_ID}:identity/${domain}`;

  try {
    const res = await client.send(
      new GetEmailIdentityCommand({ EmailIdentity: domain }),
    );

    const dkimStatus = res.DkimAttributes?.Status;
    let verificationStatus: SesDomainIdentity["verificationStatus"] = "PENDING";
    if (dkimStatus === "SUCCESS") verificationStatus = "SUCCESS";
    else if (dkimStatus === "FAILED") verificationStatus = "FAILED";
    else if (dkimStatus === "TEMPORARY_FAILURE")
      verificationStatus = "TEMPORARY_FAILURE";

    return {
      identityArn,
      tenantName,
      dnsRecords: extractDkimCnames(domain, res.DkimAttributes?.Tokens),
      verificationStatus,
    };
  } catch (e) {
    throw new SesError({
      message: `Failed to poll SES identity status for ${domain}`,
      code: "ses_poll_identity_failed",
      cause: e,
    });
  }
}

/**
 * Create per-customer IAM user + SMTP credentials scoped to their
 * domain identity ARN. If a user already exists, its access keys are
 * rotated so only one active key exists at a time.
 *
 * SMTP password is derived from the IAM secret access key using the
 * AWS SES SMTP derivation algorithm (version 4, HMAC-SHA256 chain).
 */
export async function createSmtpCredentialsForTenant(
  customerId: string,
  identityArn: string,
): Promise<SesSmtpCredentials> {
  const iam = makeIamClient();
  const username = iamUsernameFor(customerId);

  try {
    // Create user — idempotent.
    try {
      await iam.send(new CreateUserCommand({ UserName: username }));
    } catch (e) {
      if (
        !(
          e instanceof Error &&
          (e.name === "EntityAlreadyExistsException" ||
            e.message.toLowerCase().includes("already exists"))
        )
      ) {
        throw e;
      }
    }

    // Scope to sending from this domain's identity only.
    await iam.send(
      new PutUserPolicyCommand({
        UserName: username,
        PolicyName: "mailkit-ses-send",
        PolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "ses:SendRawEmail",
              Resource: identityArn,
            },
          ],
        }),
      }),
    );

    // Rotate out any existing keys (max 1 active key per user).
    const existing = await iam.send(
      new ListAccessKeysCommand({ UserName: username }),
    );
    for (const meta of existing.AccessKeyMetadata ?? []) {
      if (meta.AccessKeyId) {
        await iam.send(
          new DeleteAccessKeyCommand({
            UserName: username,
            AccessKeyId: meta.AccessKeyId,
          }),
        );
      }
    }

    const keyRes = await iam.send(
      new CreateAccessKeyCommand({ UserName: username }),
    );
    const key = keyRes.AccessKey;
    if (!key?.AccessKeyId || !key.SecretAccessKey) {
      throw new SesError({
        message: "IAM did not return access key",
        code: "iam_create_key_no_output",
      });
    }

    return {
      host: SES_SMTP_HOST,
      port: SES_SMTP_PORT,
      username: key.AccessKeyId,
      password: deriveSmtpPassword(key.SecretAccessKey, SES_REGION),
      securityMode: "starttls",
      iamUsername: username,
      iamAccessKeyId: key.AccessKeyId,
    };
  } catch (e) {
    if (e instanceof SesError) throw e;
    throw new SesError({
      message: `Failed to create SMTP credentials for customer ${customerId}`,
      code: "iam_create_smtp_failed",
      cause: e,
    });
  }
}

/**
 * Suspend a customer domain by deleting the SES email identity.
 * Immediately blocks outbound sending via Gmail Send-As. Destructive —
 * re-setup required to reinstate. Use only for confirmed ToS §13 abuse.
 */
export async function suspendTenant(domain: string): Promise<void> {
  const client = makeSesClient();
  try {
    await client.send(
      new DeleteEmailIdentityCommand({ EmailIdentity: domain }),
    );
  } catch (e) {
    throw new SesError({
      message: `Failed to suspend SES identity for ${domain}`,
      code: "ses_suspend_failed",
      cause: e,
    });
  }
}

/**
 * Delete IAM user and all access keys (cleanup on refund / account
 * deletion). Idempotent.
 */
export async function deleteSmtpCredentials(customerId: string): Promise<void> {
  const iam = makeIamClient();
  const username = iamUsernameFor(customerId);

  try {
    const existing = await iam.send(
      new ListAccessKeysCommand({ UserName: username }),
    );
    for (const meta of existing.AccessKeyMetadata ?? []) {
      if (meta.AccessKeyId) {
        await iam.send(
          new DeleteAccessKeyCommand({
            UserName: username,
            AccessKeyId: meta.AccessKeyId,
          }),
        );
      }
    }
    await iam.send(new DeleteUserCommand({ UserName: username }));
  } catch (e) {
    if (
      e instanceof Error &&
      (e.name === "NoSuchEntityException" ||
        e.message.toLowerCase().includes("not found"))
    ) {
      return;
    }
    throw new SesError({
      message: `Failed to delete IAM user ${username}`,
      code: "iam_delete_user_failed",
      cause: e,
    });
  }
}

/**
 * Fetch sending metrics for a domain from CloudWatch.
 * Returns bounce rate and complaint rate for the last N hours.
 * Used by the abuse-detection cron (replaces Brevo statistics polling).
 */
export async function getTenantStatistics(
  domain: string,
  lookbackHours = 168,
): Promise<{
  sendCount: number;
  bounceRate: number;
  complaintRate: number;
}> {
  const cw = makeCloudWatchClient();
  const endTime = new Date();
  const startTime = new Date(
    endTime.getTime() - lookbackHours * 60 * 60 * 1000,
  );
  const periodSec = lookbackHours * 3600;

  try {
    const res = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          metric("sends", "Send", domain, periodSec),
          metric("bounces", "Bounce", domain, periodSec),
          metric("complaints", "Complaint", domain, periodSec),
        ],
      }),
    );

    const val = (id: string) =>
      res.MetricDataResults?.find((r) => r.Id === id)?.Values?.[0] ?? 0;

    const sends = val("sends");
    const bounces = val("bounces");
    const complaints = val("complaints");

    return {
      sendCount: sends,
      bounceRate: sends > 0 ? bounces / sends : 0,
      complaintRate: sends > 0 ? complaints / sends : 0,
    };
  } catch (e) {
    throw new SesError({
      message: `Failed to get CloudWatch metrics for ${domain}`,
      code: "cloudwatch_metrics_failed",
      cause: e,
    });
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

function metric(id: string, name: string, domain: string, periodSec: number) {
  return {
    Id: id,
    MetricStat: {
      Metric: {
        Namespace: "AWS/SES",
        MetricName: name,
        Dimensions: [{ Name: "MailFromDomain", Value: domain }],
      },
      Period: periodSec,
      Stat: "Sum",
    },
  };
}

function extractDkimCnames(
  domain: string,
  tokens: string[] | undefined,
): SesDnsRecord[] {
  return (tokens ?? []).map((token) => ({
    type: "CNAME" as const,
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
  }));
}

/**
 * Derive the SES SMTP password from an IAM secret access key.
 *
 * AWS SMTP password derivation (version 4):
 *   kDate      = HMAC-SHA256("AWS4" + secretKey, "11111111")
 *   kRegion    = HMAC-SHA256(kDate, region)
 *   kService   = HMAC-SHA256(kRegion, "ses")
 *   kCreds     = HMAC-SHA256(kService, "aws4_request")
 *   signature  = HMAC-SHA256(kCreds, "SendRawEmail")
 *   password   = base64([0x04] + signature)
 *
 * The date "11111111" is fixed — SES SMTP passwords do not rotate on
 * calendar boundaries unlike presigned request signatures.
 */
function deriveSmtpPassword(secretAccessKey: string, region: string): string {
  const DATE = "11111111";

  function hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac("sha256", key).update(data, "utf8").digest();
  }

  const kDate = hmac(`AWS4${secretAccessKey}`, DATE);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "ses");
  const kCredentials = hmac(kService, "aws4_request");
  const signature = hmac(kCredentials, "SendRawEmail");

  return Buffer.concat([Buffer.from([0x04]), signature]).toString("base64");
}
