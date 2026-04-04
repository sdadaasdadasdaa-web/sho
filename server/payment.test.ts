import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("payment.createPix (Sigilo Pay)", () => {
  it("should create a PIX transaction with valid input", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payment.createPix({
      customer: {
        name: "João da Silva",
        email: "joao@teste.com",
        cpf: "216.435.040-53",
        phone: "(86) 94208-3736",
        address: {
          street: "Rua Teste",
          streetNumber: "123",
          complement: "Apto 1",
          zipCode: "01001000",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          country: "br",
        },
      },
      items: [
        {
          title: "Roçadeira Nakasaki 75cc",
          unitPrice: 8990,
          quantity: 1,
          tangible: true,
        },
      ],
      shippingFee: 0,
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.transactionId).not.toBe("");
    expect(result.externalRef).toMatch(/^ACHA-/);
    // PIX data should be returned with qrCode for the payment page
    expect(result.pix).toBeDefined();
    expect(typeof result.pix).toBe("object");
    // The qrCode (copia-e-cola) should be a non-empty string
    if (result.pix?.qrCode) {
      expect(typeof result.pix.qrCode).toBe("string");
      expect(result.pix.qrCode.length).toBeGreaterThan(10);
    }
  }, 15000);

  it("should reject invalid CPF (too short)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.payment.createPix({
        customer: {
          name: "João da Silva",
          email: "joao@teste.com",
          cpf: "123",
          phone: "(11) 99999-9999",
          address: {
            street: "Rua Teste",
            streetNumber: "123",
            complement: "",
            zipCode: "01001000",
            neighborhood: "Centro",
            city: "São Paulo",
            state: "SP",
            country: "br",
          },
        },
        items: [
          {
            title: "Produto Teste",
            unitPrice: 1000,
            quantity: 1,
            tangible: true,
          },
        ],
        shippingFee: 0,
      })
    ).rejects.toThrow();
  });

  it("should reject empty items array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.payment.createPix({
        customer: {
          name: "João da Silva",
          email: "joao@teste.com",
          cpf: "216.435.040-53",
          phone: "(86) 94208-3736",
          address: {
            street: "Rua Teste",
            streetNumber: "123",
            complement: "",
            zipCode: "01001000",
            neighborhood: "Centro",
            city: "São Paulo",
            state: "SP",
            country: "br",
          },
        },
        items: [],
        shippingFee: 0,
      })
    ).rejects.toThrow();
  });

  it("should calculate total amount correctly with shipping", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payment.createPix({
      customer: {
        name: "Maria Santos",
        email: "maria@teste.com",
        cpf: "529.982.247-25",
        phone: "(21) 98888-8888",
        address: {
          street: "Rua da Praia",
          streetNumber: "456",
          complement: "",
          zipCode: "20040020",
          neighborhood: "Centro",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "br",
        },
      },
      items: [
        {
          title: "Máquina Solda Inversor IGBT 250A",
          unitPrice: 8957, // R$ 89,57
          quantity: 1,
          tangible: true,
        },
      ],
      shippingFee: 1985, // R$ 19,85
    });

    expect(result.success).toBe(true);
    // Total should be 8957*1 + 1985 = 10942 (R$ 109,42)
    expect(result.amount).toBe(10942);
  }, 15000);
});
