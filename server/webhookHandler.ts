/**
 * Webhook Handler — Processa callbacks da Sigilo Pay
 *
 * Quando um pagamento PIX é confirmado, a Sigilo Pay pode enviar um
 * POST para nosso endpoint /api/webhook/sigilopay com os dados da transação.
 *
 * Este handler busca o pedido no banco, envia o evento "paid" para UTMify
 * e atualiza o status do pedido.
 */

import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendUtmifyPaidOrder } from "./utmify";

interface WebhookPayload {
  transactionId?: string;
  id?: string;
  status?: string;
  amount?: number;
  payedAt?: string;
  [key: string]: unknown;
}

/**
 * Processa o payload do webhook da Sigilo Pay.
 * Identifica a transação, verifica se está pendente no banco,
 * e se o status é COMPLETED/PAID, envia evento para UTMify.
 */
export async function processWebhookPayment(payload: WebhookPayload): Promise<void> {
  const transactionId = payload.transactionId || payload.id;
  const status = payload.status;

  if (!transactionId) {
    console.warn("[Webhook] No transactionId in payload, ignoring");
    return;
  }

  console.log(`[Webhook] Processing transaction ${transactionId} with status ${status}`);

  // Só processar se o status indica pagamento confirmado
  const isPaid = status === "COMPLETED" || status === "PAID" || status === "APPROVED";
  const isFailed = status === "FAILED" || status === "CANCELED" || status === "REJECTED";

  if (!isPaid && !isFailed) {
    console.log(`[Webhook] Status ${status} does not require action, ignoring`);
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Webhook] Database not available");
      return;
    }

    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.transactionId, transactionId))
      .limit(1);

    if (orderRows.length === 0) {
      console.warn(`[Webhook] No order found for transactionId ${transactionId}`);
      return;
    }

    const order = orderRows[0];

    if (order.status !== "pending") {
      console.log(`[Webhook] Order ${order.externalRef} already has status ${order.status}, skipping`);
      return;
    }

    if (isPaid) {
      const products = JSON.parse(order.productsJson);
      const trackingParams = order.trackingParamsJson
        ? JSON.parse(order.trackingParamsJson)
        : undefined;

      // Enviar evento "paid" para UTMify
      const utmifyResult = await sendUtmifyPaidOrder({
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
      });

      if (utmifyResult.success) {
        console.log(`[Webhook] UTMify paid event sent for ${order.externalRef}`);
      } else {
        console.error(`[Webhook] UTMify failed for ${order.externalRef}: ${utmifyResult.error}`);
      }

      // Marcar como pago no banco
      await db
        .update(orders)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(orders.id, order.id));

      console.log(`[Webhook] Order ${order.externalRef} marked as paid`);
    } else if (isFailed) {
      await db
        .update(orders)
        .set({ status: "failed" })
        .where(eq(orders.id, order.id));

      console.log(`[Webhook] Order ${order.externalRef} marked as failed`);
    }
  } catch (err) {
    console.error(`[Webhook] Error processing payment for ${transactionId}:`, err);
    throw err;
  }
}
