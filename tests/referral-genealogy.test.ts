import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerUser, getSponsorByReferralCode } from "@/server/auth/register-service";
import { getSubtree, getAncestors, getTeamStats, isDescendantOf, getDirectReferrals } from "@/server/genealogy/genealogy-service";
import { resetRateLimits } from "@/lib/rate-limit";
import { wipeAll, seedSettings } from "./helpers";

beforeAll(async () => {
  await wipeAll();
});

beforeEach(async () => {
  await wipeAll();
  await seedSettings({ autoActivate: true, referralRequired: false });
});

/** registerUser reports field-level errors on the AppError.fieldErrors property. */
async function expectRegistrationError(
  promise: Promise<unknown>,
  field: string,
  pattern: RegExp
): Promise<void> {
  const error = await promise.catch((e) => e);
  const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  expect(fieldErrors?.[field], `expected fieldErrors.${field}`).toBeTruthy();
  expect(fieldErrors![field].join(" ")).toMatch(pattern);
}

function registerInput(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Jane Tester",
    username: "janet" + Math.random().toString(36).slice(2, 7),
    email: `jane${Math.random().toString(36).slice(2, 8)}@example.test`,
    phone: "+1 555 0123",
    password: "Password123",
    confirmPassword: "Password123",
    acceptTerms: true,
    ...overrides,
  };
}

describe("registration & referral codes", () => {
  it("creates a member with a unique referral code and wallet", async () => {
    resetRateLimits();
    const result = await registerUser(registerInput(), { ip: "1.1.1.1" });
    expect(result.referralCode).toMatch(/^[A-Z0-9]{3,11}$/);
    expect(result.autoActivated).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId }, include: { wallet: true } });
    expect(user.status).toBe("ACTIVE");
    expect(user.referralCode).toBe(result.referralCode);
    expect(user.wallet).toBeTruthy();
    expect(user.passwordHash).not.toBe("Password123");
  });

  it("links the sponsor when a valid referral code is given", async () => {
    resetRateLimits();
    const sponsor = await registerUser(registerInput({ username: "sponsor1" }), { ip: "1.1.1.1" });
    resetRateLimits();
    const member = await registerUser(
      registerInput({ username: "referee1", referralCode: sponsor.referralCode }),
      { ip: "1.1.1.1" }
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    expect(user.sponsorId).toBe(sponsor.userId);
    expect(user.depth).toBe(1);
    expect(user.path).toContain(sponsor.userId);
    expect(user.path).toContain(member.userId);

    const referralRow = await prisma.referral.findUnique({ where: { refereeId: member.userId } });
    expect(referralRow?.referrerId).toBe(sponsor.userId);

    // Sponsor gets a notification.
    const note = await prisma.notification.findFirst({ where: { userId: sponsor.userId, type: "NEW_REFERRAL" } });
    expect(note).toBeTruthy();
  });

  it("stores the sponsor case-insensitively (codes are normalized)", async () => {
    resetRateLimits();
    const sponsor = await registerUser(registerInput({ username: "upper1" }), { ip: "1.1.1.1" });
    resetRateLimits();
    const member = await registerUser(
      registerInput({ username: "lower1", referralCode: sponsor.referralCode.toLowerCase() }),
      { ip: "1.1.1.1" }
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    expect(user.sponsorId).toBe(sponsor.userId);
  });

  it("rejects invalid referral codes", async () => {
    resetRateLimits();
    await expectRegistrationError(
      registerUser(registerInput({ referralCode: "NOPE999" }), { ip: "1.1.1.1" }),
      "referralCode",
      /Invalid referral code/i
    );
  });

  it("rejects referral codes from inactive sponsors", async () => {
    resetRateLimits();
    const sponsor = await registerUser(registerInput({ username: "inact1" }), { ip: "1.1.1.1" });
    await prisma.user.update({ where: { id: sponsor.userId }, data: { status: "SUSPENDED" } });
    resetRateLimits();
    await expectRegistrationError(
      registerUser(registerInput({ username: "new1", referralCode: sponsor.referralCode }), { ip: "1.1.1.1" }),
      "referralCode",
      /inactive/i
    );
  });

  it("enforces the 'referral required' setting when enabled", async () => {
    await seedSettings({ referralRequired: true });
    resetRateLimits();
    await expectRegistrationError(
      registerUser(registerInput({}), { ip: "1.1.1.1" }),
      "referralCode",
      /referral code is required/i
    );
  });

  it("validates input (passwords must match, unique email/username)", async () => {
    resetRateLimits();
    await registerUser(registerInput({ username: "dupe" }), { ip: "1.1.1.1" });
    resetRateLimits();
    await expectRegistrationError(
      registerUser(registerInput({ username: "dupe" }), { ip: "1.1.1.1" }),
      "username",
      /already taken/i
    );
    resetRateLimits();
    await expectRegistrationError(
      registerUser(registerInput({ password: "Password123", confirmPassword: "Different123" }), { ip: "1.1.1.1" }),
      "confirmPassword",
      /Passwords do not match/i
    );
  });

  it("exposes sponsor info for the registration page", async () => {
    resetRateLimits();
    const sponsor = await registerUser(registerInput({ username: "vis1" }), { ip: "1.1.1.1" });
    const info = await getSponsorByReferralCode(sponsor.referralCode);
    expect(info?.username).toBe("vis1");
    expect(await getSponsorByReferralCode("BOGUS000")).toBeNull();
  });
});

describe("genealogy", () => {
  async function buildTree() {
    // A
    // ├── B
    // │   ├── D
    // │   └── E
    // └── C
    //     ├── F
    //     └── G
    resetRateLimits();
    const A = await registerUser(registerInput({ fullName: "Alice A", username: "tree_a" }), { ip: "2.2.2.2" });
    const mk = (name: string, username: string, code: string) =>
      registerUser(registerInput({ fullName: name, username, referralCode: code }), { ip: "2.2.2.2" });
    resetRateLimits();
    const B = await mk("Bob B", "tree_b", A.referralCode);
    resetRateLimits();
    const C = await mk("Carol C", "tree_c", A.referralCode);
    resetRateLimits();
    const D = await mk("Dana D", "tree_d", B.referralCode);
    resetRateLimits();
    const E = await mk("Erin E", "tree_e", B.referralCode);
    resetRateLimits();
    const F = await mk("Frank F", "tree_f", C.referralCode);
    resetRateLimits();
    const G = await mk("Grace G", "tree_g", C.referralCode);
    return { A, B, C, D, E, F, G };
  }

  it("returns the correct subtree", async () => {
    const { A, B, D, E, C, F, G } = await buildTree();
    const subtree = await getSubtree(A.userId);
    const ids = subtree.map((u) => u.id).sort();
    expect(ids).toEqual([B.userId, C.userId, D.userId, E.userId, F.userId, G.userId].sort());

    const bSubtree = await getSubtree(B.userId);
    expect(bSubtree.map((u) => u.id).sort()).toEqual([D.userId, E.userId].sort());
    // No leakage across branches.
    expect(bSubtree.some((u) => u.id === C.userId)).toBe(false);
  });

  it("honours maxDepth", async () => {
    const { A, D, E } = await buildTree();
    const level1 = await getSubtree(A.userId, { maxDepth: 1 });
    expect(level1.every((u) => u.id !== D.userId && u.id !== E.userId)).toBe(true);
    const level2 = await getSubtree(A.userId, { maxDepth: 2 });
    expect(level2.some((u) => u.id === D.userId)).toBe(true);
  });

  it("returns the ancestor chain root→sponsor", async () => {
    const { A, B, D } = await buildTree();
    const ancestors = await getAncestors(D.userId);
    expect(ancestors.map((a) => a.id)).toEqual([A.userId, B.userId]);
    expect(await getAncestors(A.userId)).toEqual([]);
  });

  it("computes team stats by level and status", async () => {
    const { A, C } = await buildTree();
    const stats = await getTeamStats(A.userId);
    expect(stats.direct).toBe(2);
    expect(stats.total).toBe(6);
    expect(stats.active).toBe(6);
    expect(stats.byLevel).toEqual([
      { level: 1, count: 2 },
      { level: 2, count: 4 },
    ]);

    await prisma.user.update({ where: { id: C.userId }, data: { status: "SUSPENDED" } });
    const after = await getTeamStats(A.userId);
    expect(after.active).toBe(5);
    expect(after.inactive).toBe(1);
  });

  it("detects descendant relationships (cycle guard)", async () => {
    const { A, E } = await buildTree();
    expect(await isDescendantOf(A.userId, E.userId)).toBe(true);
    expect(await isDescendantOf(E.userId, A.userId)).toBe(false);
    expect(await isDescendantOf(E.userId, E.userId)).toBe(false);
  });

  it("supports search + status filter on direct referrals with pagination", async () => {
    const { A, B } = await buildTree();
    const all = await getDirectReferrals(A.userId);
    expect(all.total).toBe(2);

    const search = await getDirectReferrals(B.userId, { search: "Dana" });
    expect(search.total).toBe(1);
    expect(search.items[0].username).toBe("tree_d");

    await prisma.user.update({ where: { id: B.userId }, data: { status: "INACTIVE" } });
    const filtered = await getDirectReferrals(A.userId, { status: "INACTIVE" });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].id).toBe(B.userId);
  });
});
