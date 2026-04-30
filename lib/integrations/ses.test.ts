import { beforeEach, describe, expect, test } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
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
  PutUserPolicyCommand,
  ListAccessKeysCommand,
  DeleteAccessKeyCommand,
  CreateAccessKeyCommand,
  DeleteUserCommand,
} from "@aws-sdk/client-iam";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

const sesMock = mockClient(SESv2Client);
const iamMock = mockClient(IAMClient);
const cwMock = mockClient(CloudWatchClient);

import {
  SesError,
  SES_SMTP_HOST,
  SES_SMTP_PORT,
  createTenant,
  deleteTenant,
  verifyDomainForTenant,
  pollDomainVerification,
  createSmtpCredentialsForTenant,
  suspendTenant,
  deleteSmtpCredentials,
  getTenantStatistics,
} from "./ses";

beforeEach(() => {
  sesMock.reset();
  iamMock.reset();
  cwMock.reset();
  process.env.AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
  process.env.AWS_SECRET_ACCESS_KEY =
    "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
  process.env.AWS_ACCOUNT_ID = "123456789012";
  process.env.AWS_SES_REGION = "us-east-1";
});

// ─── credentials guard ──────────────────────────────────────────────────────

describe("missing credentials", () => {
  test("throws missing_aws_credentials when ACCESS_KEY_ID absent", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    await expect(createTenant("cust-1")).rejects.toMatchObject({
      code: "missing_aws_credentials",
    });
  });

  test("throws missing_aws_credentials when SECRET_KEY absent", async () => {
    delete process.env.AWS_SECRET_ACCESS_KEY;
    await expect(createTenant("cust-1")).rejects.toMatchObject({
      code: "missing_aws_credentials",
    });
  });
});

// ─── createTenant ────────────────────────────────────────────────────────────

describe("createTenant", () => {
  test("returns tenantName on success", async () => {
    sesMock.on(CreateTenantCommand).resolves({});
    expect(await createTenant("cust-1")).toBe("mailkit-cust-1");
  });

  test("idempotent on AlreadyExistsException", async () => {
    sesMock.on(CreateTenantCommand).rejects(
      Object.assign(new Error("already exists"), {
        name: "AlreadyExistsException",
      }),
    );
    expect(await createTenant("cust-99")).toBe("mailkit-cust-99");
  });

  test("wraps unexpected errors in ses_create_tenant_failed", async () => {
    sesMock.on(CreateTenantCommand).rejects(new Error("network error"));
    await expect(createTenant("cust-1")).rejects.toMatchObject({
      code: "ses_create_tenant_failed",
    });
  });
});

// ─── deleteTenant ────────────────────────────────────────────────────────────

describe("deleteTenant", () => {
  test("succeeds normally", async () => {
    sesMock.on(DeleteTenantCommand).resolves({});
    await expect(deleteTenant("cust-1")).resolves.toBeUndefined();
  });

  test("ignores NotFoundException", async () => {
    sesMock
      .on(DeleteTenantCommand)
      .rejects(
        Object.assign(new Error("not found"), { name: "NotFoundException" }),
      );
    await expect(deleteTenant("cust-1")).resolves.toBeUndefined();
  });
});

// ─── verifyDomainForTenant ───────────────────────────────────────────────────

describe("verifyDomainForTenant", () => {
  const TOKENS = ["tok1", "tok2", "tok3"];

  test("returns PENDING + 3 CNAME records on fresh create", async () => {
    sesMock
      .on(CreateEmailIdentityCommand)
      .resolves({ DkimAttributes: { Tokens: TOKENS } });
    sesMock.on(CreateTenantResourceAssociationCommand).resolves({});

    const result = await verifyDomainForTenant("cust-1", "example.com");
    expect(result.verificationStatus).toBe("PENDING");
    expect(result.dnsRecords).toHaveLength(3);
    expect(result.dnsRecords[0]).toEqual({
      type: "CNAME",
      name: "tok1._domainkey.example.com",
      value: "tok1.dkim.amazonses.com",
    });
    expect(result.identityArn).toContain("example.com");
    expect(result.tenantName).toBe("mailkit-cust-1");
  });

  test("falls through to poll on AlreadyExistsException", async () => {
    sesMock.on(CreateEmailIdentityCommand).rejects(
      Object.assign(new Error("already exists"), {
        name: "AlreadyExistsException",
      }),
    );
    sesMock
      .on(GetEmailIdentityCommand)
      .resolves({ DkimAttributes: { Status: "SUCCESS", Tokens: TOKENS } });

    const result = await verifyDomainForTenant("cust-1", "example.com");
    expect(result.verificationStatus).toBe("SUCCESS");
  });

  test("wraps unexpected errors in ses_create_identity_failed", async () => {
    sesMock.on(CreateEmailIdentityCommand).rejects(new Error("quota exceeded"));
    await expect(
      verifyDomainForTenant("cust-1", "example.com"),
    ).rejects.toMatchObject({ code: "ses_create_identity_failed" });
  });
});

// ─── pollDomainVerification ──────────────────────────────────────────────────

describe("pollDomainVerification", () => {
  test.each([
    ["SUCCESS", "SUCCESS"],
    ["FAILED", "FAILED"],
    ["TEMPORARY_FAILURE", "TEMPORARY_FAILURE"],
    ["PENDING", "PENDING"],
    [undefined, "PENDING"],
  ] as const)(
    "SES dkim status %s → verificationStatus %s",
    async (sesStatus, expected) => {
      sesMock
        .on(GetEmailIdentityCommand)
        .resolves({ DkimAttributes: { Status: sesStatus, Tokens: ["a"] } });
      const r = await pollDomainVerification("cust-1", "example.com");
      expect(r.verificationStatus).toBe(expected);
    },
  );

  test("wraps errors in ses_poll_identity_failed", async () => {
    sesMock.on(GetEmailIdentityCommand).rejects(new Error("timeout"));
    await expect(
      pollDomainVerification("cust-1", "example.com"),
    ).rejects.toMatchObject({ code: "ses_poll_identity_failed" });
  });
});

// ─── createSmtpCredentialsForTenant ─────────────────────────────────────────

describe("createSmtpCredentialsForTenant", () => {
  const ARN = "arn:aws:ses:us-east-1:123456789012:identity/example.com";

  function setupHappyPath(keyId = "AKIATEST123", secret = "testsecret") {
    iamMock.on(CreateUserCommand).resolves({});
    iamMock.on(PutUserPolicyCommand).resolves({});
    iamMock.on(ListAccessKeysCommand).resolves({ AccessKeyMetadata: [] });
    iamMock
      .on(CreateAccessKeyCommand)
      .resolves({
        AccessKey: {
          AccessKeyId: keyId,
          SecretAccessKey: secret,
          UserName: "mailkit-tenant-cust-1",
          Status: "Active" as const,
        },
      });
  }

  test("returns correct host, port, securityMode", async () => {
    setupHappyPath();
    const c = await createSmtpCredentialsForTenant("cust-1", ARN);
    expect(c.host).toBe(SES_SMTP_HOST);
    expect(c.port).toBe(SES_SMTP_PORT);
    expect(c.securityMode).toBe("starttls");
  });

  test("username is the IAM AccessKeyId", async () => {
    setupHappyPath();
    const c = await createSmtpCredentialsForTenant("cust-1", ARN);
    expect(c.username).toBe("AKIATEST123");
  });

  test("password is a non-empty base64 string", async () => {
    setupHappyPath();
    const c = await createSmtpCredentialsForTenant("cust-1", ARN);
    expect(c.password).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(c.password.length).toBeGreaterThan(10);
  });

  test("iamUsername follows mailkit-tenant-{customerId} pattern", async () => {
    setupHappyPath();
    const c = await createSmtpCredentialsForTenant("cust-abc", ARN);
    expect(c.iamUsername).toBe("mailkit-tenant-cust-abc");
  });

  test("rotates existing access keys before creating new one", async () => {
    iamMock.on(CreateUserCommand).resolves({});
    iamMock.on(PutUserPolicyCommand).resolves({});
    iamMock
      .on(ListAccessKeysCommand)
      .resolves({ AccessKeyMetadata: [{ AccessKeyId: "AKIAOLD" }] });
    iamMock.on(DeleteAccessKeyCommand).resolves({});
    iamMock.on(CreateAccessKeyCommand).resolves({
      AccessKey: {
        AccessKeyId: "AKIANEW",
        SecretAccessKey: "s",
        UserName: "u",
        Status: "Active" as const,
      },
    });

    const c = await createSmtpCredentialsForTenant("cust-1", ARN);
    expect(c.username).toBe("AKIANEW");
  });

  test("handles EntityAlreadyExistsException on CreateUser", async () => {
    iamMock.on(CreateUserCommand).rejects(
      Object.assign(new Error("already exists"), {
        name: "EntityAlreadyExistsException",
      }),
    );
    iamMock.on(PutUserPolicyCommand).resolves({});
    iamMock.on(ListAccessKeysCommand).resolves({ AccessKeyMetadata: [] });
    iamMock.on(CreateAccessKeyCommand).resolves({
      AccessKey: {
        AccessKeyId: "AKIATEST",
        SecretAccessKey: "s",
        UserName: "u",
        Status: "Active" as const,
      },
    });

    const c = await createSmtpCredentialsForTenant("cust-1", ARN);
    expect(c.username).toBe("AKIATEST");
  });

  test("wraps IAM errors in iam_create_smtp_failed", async () => {
    iamMock.on(CreateUserCommand).rejects(new Error("quota exceeded"));
    await expect(
      createSmtpCredentialsForTenant("cust-1", ARN),
    ).rejects.toMatchObject({ code: "iam_create_smtp_failed" });
  });
});

// ─── suspendTenant ───────────────────────────────────────────────────────────

describe("suspendTenant", () => {
  test("resolves on success", async () => {
    sesMock.on(DeleteEmailIdentityCommand).resolves({});
    await expect(suspendTenant("example.com")).resolves.toBeUndefined();
  });

  test("wraps errors in ses_suspend_failed", async () => {
    sesMock.on(DeleteEmailIdentityCommand).rejects(new Error("service error"));
    await expect(suspendTenant("example.com")).rejects.toMatchObject({
      code: "ses_suspend_failed",
    });
  });
});

// ─── deleteSmtpCredentials ───────────────────────────────────────────────────

describe("deleteSmtpCredentials", () => {
  test("deletes all keys then user", async () => {
    iamMock
      .on(ListAccessKeysCommand)
      .resolves({ AccessKeyMetadata: [{ AccessKeyId: "AKI1" }] });
    iamMock.on(DeleteAccessKeyCommand).resolves({});
    iamMock.on(DeleteUserCommand).resolves({});
    await expect(deleteSmtpCredentials("cust-1")).resolves.toBeUndefined();
  });

  test("idempotent on NoSuchEntityException", async () => {
    iamMock.on(ListAccessKeysCommand).rejects(
      Object.assign(new Error("not found"), {
        name: "NoSuchEntityException",
      }),
    );
    await expect(deleteSmtpCredentials("cust-1")).resolves.toBeUndefined();
  });

  test("wraps other errors in iam_delete_user_failed", async () => {
    iamMock.on(ListAccessKeysCommand).rejects(new Error("permission denied"));
    await expect(deleteSmtpCredentials("cust-1")).rejects.toMatchObject({
      code: "iam_delete_user_failed",
    });
  });
});

// ─── getTenantStatistics ─────────────────────────────────────────────────────

describe("getTenantStatistics", () => {
  test("returns sendCount, bounceRate, complaintRate", async () => {
    cwMock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        { Id: "sends", Values: [1000] },
        { Id: "bounces", Values: [50] },
        { Id: "complaints", Values: [2] },
      ],
    });
    const s = await getTenantStatistics("example.com");
    expect(s.sendCount).toBe(1000);
    expect(s.bounceRate).toBeCloseTo(0.05);
    expect(s.complaintRate).toBeCloseTo(0.002);
  });

  test("no division by zero when sendCount is 0", async () => {
    cwMock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        { Id: "sends", Values: [0] },
        { Id: "bounces", Values: [] },
        { Id: "complaints", Values: [] },
      ],
    });
    const s = await getTenantStatistics("example.com");
    expect(s.bounceRate).toBe(0);
    expect(s.complaintRate).toBe(0);
  });

  test("wraps errors in cloudwatch_metrics_failed", async () => {
    cwMock.on(GetMetricDataCommand).rejects(new Error("throttled"));
    await expect(getTenantStatistics("example.com")).rejects.toMatchObject({
      code: "cloudwatch_metrics_failed",
    });
  });
});

// ─── SesError ────────────────────────────────────────────────────────────────

describe("SesError", () => {
  test("name + code + message", () => {
    const err = new SesError({ message: "oops", code: "test_code" });
    expect(err.name).toBe("SesError");
    expect(err.code).toBe("test_code");
    expect(err.message).toBe("oops");
  });
});
