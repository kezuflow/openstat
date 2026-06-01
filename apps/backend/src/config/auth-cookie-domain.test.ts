import { describe, expect, it } from "vitest";

import { resolveAuthCookieDomain } from "./auth-cookie-domain.js";

describe("resolveAuthCookieDomain", () => {
  it("preserves an explicitly configured cookie domain for custom hosts", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "https://api.example.com",
        appWebUrl: "https://app.example.com",
        configuredDomain: ".configured.example.com",
      }),
    ).toBe(".configured.example.com");
  });

  it("infers a shared cookie domain for the OpenStat web and API subdomains", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "https://api.openstat.online",
        appWebUrl: "https://www.openstat.online",
      }),
    ).toBe(".openstat.online");
  });

  it("normalizes an overly narrow hosted cookie domain", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "https://api.openstat.online",
        appWebUrl: "https://www.openstat.online",
        configuredDomain: ".api.openstat.online",
      }),
    ).toBe(".openstat.online");
  });

  it("does not infer a cookie domain across unrelated deployment hosts", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "https://api.openstat.online",
        appWebUrl: "https://openstat-web.vercel.app",
      }),
    ).toBeUndefined();
  });

  it("requires an explicit cookie domain for custom deployment hosts", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "https://api.example.com",
        appWebUrl: "https://app.example.com",
      }),
    ).toBeUndefined();
  });

  it("does not infer a cookie domain for localhost", () => {
    expect(
      resolveAuthCookieDomain({
        apiPublicUrl: "http://localhost:4000",
        appWebUrl: "http://localhost:3000",
      }),
    ).toBeUndefined();
  });
});
