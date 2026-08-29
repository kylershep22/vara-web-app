/**
 * userFields — the server-side read-through for the userPrivate migration.
 *
 * WHY THIS IS TESTED AT ALL. The client writes push tokens to userPrivate ONLY;
 * there is no dual-write, because a fresh token left on the world-readable
 * profile would defeat the move. That makes these senders the half that has to
 * cope with data in two places. And the failure mode is silent: every sender
 * treats a missing token as an early `return`, not an error, so getting this
 * wrong would stop delivering to half the install base with nothing in the logs
 * to say so.
 */

const mockPrivateGet = jest.fn();
const mockPublicGet = jest.fn();

jest.mock("firebase-admin", () => ({
  firestore: () => ({
    collection: (name) => ({
      doc: () => ({
        get: name === "userPrivate" ? mockPrivateGet : mockPublicGet,
      }),
    }),
  }),
}));

const {getFcmToken, getMergedUser, getUserField} = require("../lib/userFields");

const absent = {exists: false};
const present = (data) => ({exists: true, data: () => data});

describe("getFcmToken", () => {
  beforeEach(() => {
    mockPrivateGet.mockReset();
    mockPublicGet.mockReset();
  });

  it("prefers the private token — a user on a new build", async () => {
    mockPrivateGet.mockResolvedValue(present({fcmToken: "new-token"}));
    mockPublicGet.mockResolvedValue(present({fcmToken: "stale-token"}));

    expect(await getFcmToken("u1")).toBe("new-token");
  });

  it("falls back to users/{uid} — a user who has not updated", async () => {
    mockPrivateGet.mockResolvedValue(absent);
    mockPublicGet.mockResolvedValue(present({fcmToken: "old-token"}));

    expect(await getFcmToken("u1")).toBe("old-token");
  });

  it("falls back when the private document exists but carries no token", async () => {
    // The common shape mid-migration: a private document created by some other
    // write (onboarding, consent) before the device ever re-registered.
    mockPrivateGet.mockResolvedValue(present({aiConsent: true}));
    mockPublicGet.mockResolvedValue(present({fcmToken: "old-token"}));

    expect(await getFcmToken("u1")).toBe("old-token");
  });

  it("falls back when the private token is null rather than missing", async () => {
    mockPrivateGet.mockResolvedValue(present({fcmToken: null}));
    mockPublicGet.mockResolvedValue(present({fcmToken: "old-token"}));

    expect(await getFcmToken("u1")).toBe("old-token");
  });

  it("returns undefined when neither document has a token", async () => {
    mockPrivateGet.mockResolvedValue(absent);
    mockPublicGet.mockResolvedValue(present({displayName: "Alice"}));

    expect(await getFcmToken("u1")).toBeUndefined();
  });

  it("returns undefined when the user has no documents at all", async () => {
    mockPrivateGet.mockResolvedValue(absent);
    mockPublicGet.mockResolvedValue(absent);

    expect(await getFcmToken("u1")).toBeUndefined();
  });
});

describe("getUserField", () => {
  beforeEach(() => {
    mockPrivateGet.mockReset();
    mockPublicGet.mockReset();
  });

  it("reads any field with the same private-first ordering", async () => {
    mockPrivateGet.mockResolvedValue(present({expoPushToken: "private"}));
    mockPublicGet.mockResolvedValue(present({expoPushToken: "public"}));

    expect(await getUserField("u1", "expoPushToken")).toBe("private");
  });

  it("treats a false private value as a real value, not as missing", async () => {
    // `false` is a legitimate stored value for the boolean fields on this
    // document. A truthiness check here would fall through to the stale public
    // copy and invert the user's setting.
    mockPrivateGet.mockResolvedValue(present({aiConsent: false}));
    mockPublicGet.mockResolvedValue(present({aiConsent: true}));

    expect(await getUserField("u1", "aiConsent")).toBe(false);
  });
});

describe("getMergedUser", () => {
  beforeEach(() => {
    mockPrivateGet.mockReset();
    mockPublicGet.mockReset();
  });

  it("layers the private document over the public one", async () => {
    mockPrivateGet.mockResolvedValue(present({subscriptionType: "premium"}));
    mockPublicGet.mockResolvedValue(
        present({displayName: "Alice", subscriptionType: "none"}),
    );

    expect(await getMergedUser("u1")).toEqual({
      displayName: "Alice",
      subscriptionType: "premium",
    });
  });

  it("never lets the private store's createdAt shadow the account's", async () => {
    // On users/{uid} createdAt is the account creation time, which the
    // milestone sender uses to compute how long someone has been here. On
    // userPrivate it is merely when the private document was first written.
    mockPrivateGet.mockResolvedValue(present({createdAt: "private-doc-created"}));
    mockPublicGet.mockResolvedValue(present({createdAt: "account-created"}));

    expect((await getMergedUser("u1")).createdAt).toBe("account-created");
  });

  it("returns null when the user has neither document", async () => {
    mockPrivateGet.mockResolvedValue(absent);
    mockPublicGet.mockResolvedValue(absent);

    expect(await getMergedUser("u1")).toBeNull();
  });
});
