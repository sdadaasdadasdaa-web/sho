import { describe, it, expect } from "vitest";

describe("SigiloPay credentials", () => {
  it("should have SIGILO_PAY_PUBLIC_KEY set", () => {
    const key = process.env.SIGILO_PAY_PUBLIC_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
  });

  it("should have SIGILO_PAY_SECRET_KEY set", () => {
    const key = process.env.SIGILO_PAY_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
  });

  it("should successfully authenticate against Sigilo Pay API", async () => {
    const publicKey = process.env.SIGILO_PAY_PUBLIC_KEY;
    const secretKey = process.env.SIGILO_PAY_SECRET_KEY;

    // Try the balance endpoint which requires auth
    const response = await fetch(
      "https://app.sigilopay.com.br/api/v1/gateway/balance",
      {
        method: "GET",
        headers: {
          "x-public-key": publicKey!,
          "x-secret-key": secretKey!,
        },
      }
    );

    const text = await response.text();
    console.log("[SigiloPay Test] Auth response status:", response.status, text);

    // If 401, credentials are invalid. Any other status means credentials work.
    expect(response.status).not.toBe(401);
  });
});
