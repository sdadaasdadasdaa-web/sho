import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createPixTransaction, getTransactionStatus } from "./sigilopay";
import { sendUtmifyPendingOrder, sendUtmifyPaidOrder, sendUtmifyTrackingEvent } from "./utmify";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

const addressSchema = z.object({
  street: z.string(),
  streetNumber: z.string(),
  complement: z.string().default(""),
  zipCode: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string().default("br"),
});

const itemSchema = z.object({
  title: z.string(),
  unitPrice: z.number().int(), // centavos
  quantity: z.number().int().min(1),
  tangible: z.boolean().default(true),
  externalRef: z.string().optional(),
});

const createPixTransactionSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    cpf: z.string().min(11).max(14),
    phone: z.string().min(10),
    address: addressSchema,
  }),
  items: z.array(itemSchema).min(1),
  shippingFee: z.number().int().default(0),
  metadata: z.string().optional(),
  trackingParams: z.object({
    src: z.string().nullable().optional(),
    sck: z.string().nullable().optional(),
    utm_source: z.string().nullable().optional(),
    utm_campaign: z.string().nullable().optional(),
    utm_medium: z.string().nullable().optional(),
    utm_content: z.string().nullable().optional(),
    utm_term: z.string().nullable().optional(),
  }).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Proxy server-side para eventos de tracking UTMify
  tracking: router({
    sendEvent: publicProcedure
      .input(
        z.object({
          type: z.enum(["PageView", "InitiateCheckout", "ViewContent"]),
          lead: z.object({
            _id: z.string().optional(),
            userAgent: z.string(),
            locale: z.string(),
            parameters: z.record(z.string(), z.string()).optional(),
          }),
          event: z.object({
            pageTitle: z.string(),
            sourceUrl: z.string(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const clientIp =
          (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          ctx.req.socket.remoteAddress ||
          "";

        const result = await sendUtmifyTrackingEvent({
          type: input.type,
          lead: {
            ...input.lead,
            pixelId: "69251f2e83c0b0e4729553f9",
            ip: clientIp,
          },
          event: input.event,
          clientIp,
        });

        return {
          success: result.success,
          lead: result.lead || null,
          error: result.error || null,
        };
      }),
  }),

  payment: router({
    createPix: publicProcedure
      .input(createPixTransactionSchema)
      .mutation(async ({ input }) => {
        // Validar credenciais antes de tentar criar transação
        if (!ENV.sigiloPaySecretKey || !ENV.sigiloPayPublicKey) {
          throw new Error("Credenciais do gateway de pagamento não configuradas. Configure SIGILO_PAY_SECRET_KEY e SIGILO_PAY_PUBLIC_KEY.");
        }

        const externalRef = `ACHA-${nanoid(10)}`;

        // Calcular o total em centavos
        const itemsTotal = input.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
        const totalAmountCents = itemsTotal + input.shippingFee;

        // Converter centavos para reais (Sigilo Pay usa reais)
        const shippingFeeReais = Math.round(input.shippingFee) / 100;

        // Limpar CPF (remover pontos e traços)
        const cleanCpf = input.customer.cpf.replace(/\D/g, "");
        const cleanPhone = input.customer.phone.replace(/\D/g, "");

        // Validar CPF no backend (dígitos verificadores)
        if (cleanCpf.length !== 11 || /^(\d)\1{10}$/.test(cleanCpf)) {
          throw new Error("CPF inválido. Verifique os números e tente novamente.");
        }
        let cpfSum = 0;
        for (let i = 0; i < 9; i++) cpfSum += parseInt(cleanCpf[i]) * (10 - i);
        let cpfRest = (cpfSum * 10) % 11;
        if (cpfRest === 10) cpfRest = 0;
        if (cpfRest !== parseInt(cleanCpf[9])) {
          throw new Error("CPF inválido. Verifique os números e tente novamente.");
        }
        cpfSum = 0;
        for (let i = 0; i < 10; i++) cpfSum += parseInt(cleanCpf[i]) * (11 - i);
        cpfRest = (cpfSum * 10) % 11;
        if (cpfRest === 10) cpfRest = 0;
        if (cpfRest !== parseInt(cleanCpf[10])) {
          throw new Error("CPF inválido. Verifique os números e tente novamente.");
        }

        // Formatar telefone para (XX) XXXXX-XXXX
        const formattedPhone = cleanPhone.length === 11
          ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
          : cleanPhone.length === 10
            ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`
            : cleanPhone;

        // Formatar CPF para XXX.XXX.XXX-XX
        const formattedCpf = cleanCpf.length === 11
          ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`
          : cleanCpf;

        // Data de vencimento para a Sigilo Pay (formato YYYY-MM-DD, mínimo amanhã)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // Expiração visual do QR Code no frontend: 30 minutos
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 30);
        const expirationISO = expirationDate.toISOString();

        // Calcular amount total em reais (arredondado para 2 casas decimais)
        const calculatedAmount = Math.round(totalAmountCents) / 100;

        console.log(`[Payment] Creating PIX for ${externalRef}: amount=${calculatedAmount}, itemsTotal=${Math.round(itemsTotal)/100}, shipping=${shippingFeeReais}`);

        // IMPORTANTE: Não enviar campo "products" à Sigilo Pay.
        // A API rejeita com erro 400 "Invalid products" quando os IDs não estão
        // cadastrados na plataforma. Enviamos apenas o amount total.
        // Os detalhes dos itens ficam salvos no metadata e no banco de dados.
        const result = await createPixTransaction({
          identifier: externalRef,
          amount: calculatedAmount,
          shippingFee: shippingFeeReais > 0 ? shippingFeeReais : undefined,
          client: {
            name: input.customer.name,
            email: input.customer.email,
            phone: formattedPhone,
            document: formattedCpf,
          },
          dueDate: dueDateStr,
          metadata: {
            order_number: externalRef,
            items: JSON.stringify(input.items.map(i => ({ title: i.title, qty: i.quantity, price: i.unitPrice }))),
          },
        });

        const transactionId = result.transactionId;
        const pixCode = result.pix?.code || null;
        const pixBase64 = result.pix?.base64 || null;
        const pixImageUrl = result.pix?.image || null;

        // Formatar data UTC para UTMify
        const createdAtUTC = new Date().toISOString().replace("T", " ").substring(0, 19);

        // Preparar produtos para UTMify
        const utmifyProducts = input.items.map((item, idx) => ({
          id: item.externalRef || `item-${idx + 1}`,
          name: item.title,
          quantity: item.quantity,
          priceInCents: item.unitPrice * item.quantity,
        }));

        // Persistir pedido no banco de dados (sobrevive a restarts do servidor)
        try {
          const db = await getDb();
          if (db) {
            await db.insert(orders).values({
              transactionId,
              externalRef,
              customerName: input.customer.name,
              customerEmail: input.customer.email,
              customerPhone: cleanPhone,
              customerCpf: cleanCpf,
              productsJson: JSON.stringify(utmifyProducts),
              totalInCents: totalAmountCents,
              trackingParamsJson: input.trackingParams ? JSON.stringify(input.trackingParams) : null,
              status: "pending",
            });
            console.log(`[Order] Saved to DB: ${transactionId} (${externalRef})`);
          }
        } catch (dbErr) {
          console.error("[Order] Failed to save to DB:", dbErr);
          // Não bloquear o pagamento se o DB falhar
        }

        // Tracking params processados (log omitido — contém dados de marketing sensíveis)

        // Enviar evento "waiting_payment" para UTMify (fire-and-forget)
        sendUtmifyPendingOrder({
          orderId: externalRef,
          customer: {
            name: input.customer.name,
            email: input.customer.email,
            phone: cleanPhone,
            cpf: cleanCpf,
          },
          products: utmifyProducts,
          totalInCents: totalAmountCents,
          trackingParams: input.trackingParams,
        }).catch((err) => {
          console.error("[UTMify] Error sending pending order:", err);
        });

        return {
          success: true,
          transactionId,
          status: result.status,
          amount: totalAmountCents,
          pix: {
            qrCode: pixCode,
            qrCodeBase64: pixBase64,
            qrCodeImageUrl: pixImageUrl,
            expirationDate: expirationISO,
          },
          externalRef,
        };
      }),

    checkStatus: publicProcedure
      .input(z.object({ transactionId: z.string() }))
      .query(async ({ input }) => {
        const result = await getTransactionStatus(input.transactionId);

        // Mapear status da Sigilo Pay para o formato esperado pelo frontend
        let normalizedStatus = "pending";
        if (result.status === "COMPLETED") {
          normalizedStatus = "paid";
        } else if (result.status === "FAILED") {
          normalizedStatus = "failed";
        } else if (result.status === "REFUNDED") {
          normalizedStatus = "refunded";
        } else if (result.status === "CHARGED_BACK") {
          normalizedStatus = "charged_back";
        } else if (result.status === "PENDING") {
          normalizedStatus = "pending";
        }

        console.log(`[Payment] Status check for ${input.transactionId}: raw=${result.status}, normalized=${normalizedStatus}`);

        // Se o status mudou para "paid", enviar evento para UTMify
        if (normalizedStatus === "paid") {
          try {
            const db = await getDb();
            if (db) {
              const orderRows = await db.select().from(orders)
                .where(eq(orders.transactionId, input.transactionId))
                .limit(1);

              if (orderRows.length > 0 && orderRows[0].status === "pending") {
                const order = orderRows[0];
                const products = JSON.parse(order.productsJson);
                const trackingParams = order.trackingParamsJson ? JSON.parse(order.trackingParamsJson) : undefined;

                // Enviar evento "paid" para UTMify
                sendUtmifyPaidOrder({
                  orderId: order.externalRef,
                  createdAt: order.createdAt.toISOString().replace("T", " ").substring(0, 19),
                  customer: {
                    name: order.customerName || "",
                    email: order.customerEmail || "",
                    phone: order.customerPhone || "",
                    cpf: order.customerCpf || "",
                  },
                  products,
                  totalInCents: order.totalInCents,
                  trackingParams,
                }).catch((err) => {
                  console.error("[UTMify] Error sending paid order:", err);
                });

                // Marcar como pago no banco (evitar duplicatas)
                await db.update(orders)
                  .set({ status: "paid", paidAt: new Date() })
                  .where(eq(orders.transactionId, input.transactionId));

                console.log(`[Order] Marked as paid: ${input.transactionId} (${order.externalRef})`);
              }
            }
          } catch (dbErr) {
            console.error("[Order] Error processing paid status:", dbErr);
          }
        }

        return {
          status: normalizedStatus,
          paidAt: result.payedAt || null,
          amount: Math.round(result.amount * 100),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
