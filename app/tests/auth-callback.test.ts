import test from "node:test";
import assert from "node:assert/strict";
import { handleAuthCallback } from "../lib/auth-callback";

function assertRedirect(response: Response, location: string) {
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("Location"), location);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
}

test("successful code exchange redirects locally despite the internal request origin", async () => {
  const exchanged: string[] = [];
  const response = await handleAuthCallback(
    new Request("https://localhost:3218/auth/callback?code=valid-code"),
    async (code) => {
      exchanged.push(code);
      return { error: null };
    },
  );
  assert.deepEqual(exchanged, ["valid-code"]);
  assertRedirect(response, "/onboarding");
  for (const origin of ["https://humans-only.de", "https://ho.nm-forum.de"])
    assert.equal(
      new URL(response.headers.get("Location")!, origin).href,
      `${origin}/onboarding`,
    );
});

test("rejected or expired code returns to the local invitation page", async () => {
  const response = await handleAuthCallback(
    new Request("https://localhost:3218/auth/callback?code=expired-code"),
    async () => ({ error: new Error("Code expired") }),
  );
  assertRedirect(response, "/invite?auth_error=1");
});

test("missing and empty codes never attempt an exchange", async () => {
  for (const query of ["", "?code="]) {
    const response = await handleAuthCallback(
      new Request(`https://localhost:3218/auth/callback${query}`),
      async () => assert.fail("No code should be exchanged"),
    );
    assertRedirect(response, "/invite?auth_error=1");
  }
});

test("demo mode without a code exchanger cannot establish a live session", async () => {
  const response = await handleAuthCallback(
    new Request("https://localhost:3218/auth/callback?code=unused-code"),
  );
  assertRedirect(response, "/invite?auth_error=1");
});

test("caller-supplied hosts, forwarded headers and next parameters cannot change either destination", async () => {
  for (const error of [null, new Error("Invalid code")]) {
    const response = await handleAuthCallback(
      new Request(
        "https://attacker.example/auth/callback?code=test-code&next=https://attacker.example/collect",
        {
          headers: {
            Host: "attacker.example",
            "X-Forwarded-Host": "attacker.example",
            "X-Forwarded-Proto": "http",
          },
        },
      ),
      async () => ({ error }),
    );
    assertRedirect(response, error ? "/invite?auth_error=1" : "/onboarding");
  }
});
