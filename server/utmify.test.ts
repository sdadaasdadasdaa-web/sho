import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock axios to avoid real HTTP calls
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import axios from "axios";
const mockedAxios = vi.mocked(axios);

function createPublicContext(
  headers: Record<string, string> = {}
): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {
        "x-forwarded-for": "189.100.50.25",
        ...headers,
      },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("tracking.sendEvent (server-side proxy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a PageView event and returns the lead", async () => {
    const mockLead = {
      _id: "lead123",
      pixelId: "69251f2e83c0b0e4729553f9",
      ip: "189.100.50.25",
    };
    const mockEvent = {
      _id: "event456",
      type: "PageView",
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: { lead: mockLead, event: mockEvent },
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tracking.sendEvent({
      type: "PageView",
      lead: {
        userAgent: "Mozilla/5.0 Test",
        locale: "pt-BR",
      },
      event: {
        pageTitle: "AchaShop - Teste",
        sourceUrl: "https://achados-production.up.railway.app/produto/21",
      },
    });

    expect(result.success).toBe(true);
    expect(result.lead).toBeDefined();
    expect(result.lead._id).toBe("lead123");

    // Verify axios was called with correct URL and payload
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toBe("https://tracking.utmify.com.br/tracking/v1/events");
    expect(body.type).toBe("PageView");
    expect(body.lead.pixelId).toBe("69251f2e83c0b0e4729553f9");
    expect(body.lead.ip).toBe("189.100.50.25");
    expect(body.event.pageTitle).toBe("AchaShop - Teste");
  });

  it("sends an InitiateCheckout event with existing lead", async () => {
    const mockLead = {
      _id: "lead789",
      pixelId: "69251f2e83c0b0e4729553f9",
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: { lead: mockLead, event: { _id: "evt789", type: "InitiateCheckout" } },
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tracking.sendEvent({
      type: "InitiateCheckout",
      lead: {
        _id: "existing-lead-id",
        userAgent: "Mozilla/5.0 Test",
        locale: "pt-BR",
      },
      event: {
        pageTitle: "AchaShop - Produto",
        sourceUrl: "https://achados-production.up.railway.app/produto/21",
      },
    });

    expect(result.success).toBe(true);
    expect(result.lead._id).toBe("lead789");

    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.type).toBe("InitiateCheckout");
    expect(body.lead._id).toBe("existing-lead-id");
  });

  it("handles API errors gracefully", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      new Error("Network timeout")
    );

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tracking.sendEvent({
      type: "PageView",
      lead: {
        userAgent: "Mozilla/5.0 Test",
        locale: "pt-BR",
      },
      event: {
        pageTitle: "Test Page",
        sourceUrl: "https://example.com",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network timeout");
    expect(result.lead).toBeNull();
  });

  it("extracts first client IP from x-forwarded-for header", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { lead: { _id: "lead-ip" }, event: { _id: "evt-ip" } },
    });

    const ctx = createPublicContext({
      "x-forwarded-for": "201.50.100.200, 10.0.0.1",
    });
    const caller = appRouter.createCaller(ctx);

    await caller.tracking.sendEvent({
      type: "PageView",
      lead: {
        userAgent: "Test",
        locale: "pt-BR",
      },
      event: {
        pageTitle: "Test",
        sourceUrl: "https://example.com",
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.lead.ip).toBe("201.50.100.200");
  });

  it("passes lead parameters (UTMs) when provided", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { lead: { _id: "lead-params" }, event: { _id: "evt-params" } },
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.tracking.sendEvent({
      type: "PageView",
      lead: {
        userAgent: "Test",
        locale: "pt-BR",
        parameters: {
          utm_source: "facebook",
          utm_campaign: "teste",
          src: "fb",
        },
      },
      event: {
        pageTitle: "Test",
        sourceUrl: "https://example.com?utm_source=facebook",
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.lead.parameters).toEqual({
      utm_source: "facebook",
      utm_campaign: "teste",
      src: "fb",
    });
  });
});

describe("UTMify order functions (via API credentials)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendUtmifyPendingOrder sends waiting_payment with tracking params", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    const { sendUtmifyPendingOrder } = await import("./utmify");

    const result = await sendUtmifyPendingOrder({
      orderId: "ACHA-test123",
      customer: {
        name: "João Silva",
        email: "joao@test.com",
        phone: "11999999999",
        cpf: "12345678901",
      },
      products: [
        { id: "prod-1", name: "Roçadeira", quantity: 1, priceInCents: 8990 },
      ],
      totalInCents: 8990,
      trackingParams: {
        src: "fb",
        sck: "teste123",
        utm_source: "facebook",
        utm_campaign: "teste_rocadeira",
        utm_medium: "cpc",
      },
    });

    expect(result.success).toBe(true);

    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toBe("https://api.utmify.com.br/api-credentials/orders");
    expect(body.status).toBe("waiting_payment");
    expect(body.orderId).toBe("ACHA-test123");
    expect(body.platform).toBe("AchaShop");
    expect(body.trackingParameters.src).toBe("fb");
    expect(body.trackingParameters.sck).toBe("teste123");
    expect(body.trackingParameters.utm_source).toBe("facebook");
    expect(body.customer.name).toBe("João Silva");
    expect(body.commission.totalPriceInCents).toBe(8990);
  });

  it("sendUtmifyPaidOrder sends paid status with approvedDate", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    const { sendUtmifyPaidOrder } = await import("./utmify");

    const result = await sendUtmifyPaidOrder({
      orderId: "ACHA-paid456",
      createdAt: "2026-03-21 15:00:00",
      customer: {
        name: "Maria Santos",
        email: "maria@test.com",
        phone: "11888888888",
        cpf: "98765432100",
      },
      products: [
        { id: "prod-2", name: "Parafusadeira", quantity: 2, priceInCents: 5990 },
      ],
      totalInCents: 11980,
      trackingParams: {
        src: "fb",
        utm_source: "facebook",
      },
    });

    expect(result.success).toBe(true);

    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.status).toBe("paid");
    expect(body.orderId).toBe("ACHA-paid456");
    expect(body.createdAt).toBe("2026-03-21 15:00:00");
    expect(body.approvedDate).toBeTruthy();
    expect(body.trackingParameters.src).toBe("fb");
  });

  it("handles null tracking params gracefully", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    const { sendUtmifyPendingOrder } = await import("./utmify");

    const result = await sendUtmifyPendingOrder({
      orderId: "ACHA-notrack",
      customer: {
        name: "Sem UTM",
        email: "sem@test.com",
        phone: "11777777777",
        cpf: "11111111111",
      },
      products: [
        { id: "prod-3", name: "Alicate", quantity: 1, priceInCents: 1990 },
      ],
      totalInCents: 1990,
      // No trackingParams provided
    });

    expect(result.success).toBe(true);

    const [, body] = mockedAxios.post.mock.calls[0];
    expect(body.trackingParameters.src).toBeNull();
    expect(body.trackingParameters.sck).toBeNull();
    expect(body.trackingParameters.utm_source).toBeNull();
  });
});
