/**
 * Order Reconciler — Job de reconciliação periódica de pedidos pendentes
 *
 * Problema: O envio do evento "paid" para UTMify dependia 100% do polling
 * do frontend. Se o cliente fechasse a aba antes de pagar, o evento nunca
 * era enviado.
 *
 * Solução: Este módulo roda a cada 2 minutos no servidor, busca pedidos
 * com status "pending" no banco de dados, consulta o status na Sigilo Pay
 * e, se o pagamento foi confirmado, envia o evento "paid" para UTMify.
 */

import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getTransactionStatus } from "./sigilopay";
import { sendUtmifyPaidOrder } from "./utmify";

const RECONCILE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
// Só reconciliar pedidos criados nas últimas 24 horas (evitar consultar pedidos antigos)
const MAX_ORDER_AGE_MS = 24 * 60 * 60 * 1000;

let reconcilerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Processa um pedido pendente: consulta status na Sigilo Pay e,
 * se pago, envia evento para UTMify e atualiza o banco.
 */
async function processOrder(order: {
  // Log de início de processamento
  id: number;
  transactionId: string;
  externalRef: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCpf: string | null;
  productsJson: string;
  totalInCents: number;
  trackingParamsJson: string | null;
  createdAt: Date;
}): Promise<void> {
  try {
    console.log(`[Reconciler] Checking order ${order.externalRef} (txn: ${order.transactionId})...`);
    const result = await getTransactionStatus(order.transactionId);
    console.log(`[Reconciler] Order ${order.externalRef}: status=${result.status}`);

    if (result.status === "COMPLETED") {
      console.log(`[Reconciler] Payment confirmed for ${order.externalRef} (${order.transactionId})`);

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
        console.log(`[Reconciler] UTMify paid event sent for ${order.externalRef}`);
      } else {
        console.error(`[Reconciler] UTMify failed for ${order.externalRef}: ${utmifyResult.error}`);
      }

      // Marcar como pago no banco (evitar duplicatas)
      const db = await getDb();
      if (db) {
        await db
          .update(orders)
          .set({ status: "paid", paidAt: new Date() })
          .where(eq(orders.id, order.id));
        console.log(`[Reconciler] Order ${order.externalRef} marked as paid in DB`);
      }
    } else if (result.status === "FAILED" || result.status === "CANCELED" || result.status === "REJECTED") {
      // Marcar como falho para não consultar novamente
      const db = await getDb();
      if (db) {
        await db
          .update(orders)
          .set({ status: "failed" })
          .where(eq(orders.id, order.id));
        console.log(`[Reconciler] Order ${order.externalRef} marked as ${result.status} in DB`);
      }
    }
    // Se PENDING, não faz nada — será verificado na próxima rodada
  } catch (err: any) {
    console.error(`[Reconciler] Error processing order ${order.externalRef}: ${err?.message || err}`);
  }
}

/**
 * Executa uma rodada de reconciliação: busca todos os pedidos pendentes
 * recentes e verifica o status de cada um na Sigilo Pay.
 */
async function reconcilePendingOrders(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Reconciler] Database not available, skipping reconciliation");
      return;
    }

    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending"));

    // Filtrar apenas pedidos recentes (últimas 24h)
    const cutoff = new Date(Date.now() - MAX_ORDER_AGE_MS);
    const recentPending = pendingOrders.filter(
      (o) => o.createdAt >= cutoff
    );

    if (recentPending.length === 0) {
      return; // Nada para reconciliar
    }

    console.log(`[Reconciler] Checking ${recentPending.length} pending order(s)...`);

    // Processar sequencialmente para não sobrecarregar a API da Sigilo Pay
    for (const order of recentPending) {
      await processOrder(order);
      // Pequeno delay entre chamadas para evitar rate limiting
      if (recentPending.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (err) {
    console.error("[Reconciler] Error during reconciliation:", err);
  }
}

/**
 * Inicia o job de reconciliação periódica.
 * Deve ser chamado uma vez durante o startup do servidor.
 */
export function startOrderReconciler(): void {
  if (reconcilerTimer) {
    console.warn("[Reconciler] Already running, skipping duplicate start");
    return;
  }

  console.log(`[Reconciler] Started — checking pending orders every ${RECONCILE_INTERVAL_MS / 1000}s`);

  // Executar a primeira reconciliação após 30 segundos (dar tempo para o servidor iniciar)
  setTimeout(() => {
    reconcilePendingOrders();
  }, 30_000);

  // Depois, executar a cada 2 minutos
  reconcilerTimer = setInterval(() => {
    reconcilePendingOrders();
  }, RECONCILE_INTERVAL_MS);
}

/**
 * Para o job de reconciliação (útil para testes e shutdown graceful).
 */
export function stopOrderReconciler(): void {
  if (reconcilerTimer) {
    clearInterval(reconcilerTimer);
    reconcilerTimer = null;
    console.log("[Reconciler] Stopped");
  }
}

/**
 * Executa reconciliação manualmente (útil para testes e debugging).
 */
export { reconcilePendingOrders };
