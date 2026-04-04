import axios from "axios";
import { ENV } from "./_core/env";

const UTMIFY_API_URL = "https://api.utmify.com.br/api-credentials/orders";
const UTMIFY_TRACKING_URL = "https://tracking.utmify.com.br/tracking/v1";
const PIXEL_ID = "69251f2e83c0b0e4729553f9";

interface UtmifyCustomer {
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  country?: string;
  ip?: string;
}

interface UtmifyProduct {
  id: string;
  name: string;
  planId: string | null;
  planName: string | null;
  quantity: number;
  priceInCents: number;
}

interface UtmifyTrackingParameters {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

interface UtmifyCommission {
  totalPriceInCents: number;
  gatewayFeeInCents: number;
  userCommissionInCents: number;
  currency?: "BRL" | "USD" | "EUR" | "GBP" | "ARS" | "CAD";
}

interface UtmifyOrderPayload {
  orderId: string;
  platform: string;
  paymentMethod: "credit_card" | "boleto" | "pix" | "paypal" | "free_price";
  status: "waiting_payment" | "paid" | "refused" | "refunded" | "chargedback";
  createdAt: string;
  approvedDate: string | null;
  refundedAt: string | null;
  customer: UtmifyCustomer;
  products: UtmifyProduct[];
  trackingParameters: UtmifyTrackingParameters;
  commission: UtmifyCommission;
  isTest?: boolean;
}

function formatDateUTC(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Envia um evento de pedido para a UTMify
 */
export async function sendUtmifyOrder(payload: UtmifyOrderPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(UTMIFY_API_URL, payload, {
      headers: {
        "x-api-token": ENV.utmifyApiToken,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log(`[UTMify] Order ${payload.orderId} sent with status ${payload.status} — API response: ${response.status}`);
    return { success: true };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message || "Unknown error";
    const statusCode = error?.response?.status || 'N/A';
    const responseData = error?.response?.data ? JSON.stringify(error.response.data) : 'N/A';
    console.error(`[UTMify] Failed to send order ${payload.orderId}: status=${statusCode}, msg=${errorMsg}, response=${responseData}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Envia evento de "Pedido Pendente" (PIX gerado, aguardando pagamento)
 */
export async function sendUtmifyPendingOrder(params: {
  orderId: string;
  customer: { name: string; email: string; phone: string; cpf: string };
  products: { id: string; name: string; quantity: number; priceInCents: number }[];
  totalInCents: number;
  trackingParams?: {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_campaign?: string | null;
    utm_medium?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date();

  const payload: UtmifyOrderPayload = {
    orderId: params.orderId,
    platform: "AchaShop",
    paymentMethod: "pix",
    status: "waiting_payment",
    createdAt: formatDateUTC(now),
    approvedDate: null,
    refundedAt: null,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      document: params.customer.cpf,
      country: "BR",
    },
    products: params.products.map((p) => ({
      id: p.id,
      name: p.name,
      planId: null,
      planName: null,
      quantity: p.quantity,
      priceInCents: p.priceInCents,
    })),
    trackingParameters: {
      src: params.trackingParams?.src ?? null,
      sck: params.trackingParams?.sck ?? null,
      utm_source: params.trackingParams?.utm_source ?? null,
      utm_campaign: params.trackingParams?.utm_campaign ?? null,
      utm_medium: params.trackingParams?.utm_medium ?? null,
      utm_content: params.trackingParams?.utm_content ?? null,
      utm_term: params.trackingParams?.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: params.totalInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: params.totalInCents,
      currency: "BRL",
    },
  };

  return sendUtmifyOrder(payload);
}

/**
 * Envia evento de "Pedido Pago" (pagamento PIX confirmado)
 */
export async function sendUtmifyPaidOrder(params: {
  orderId: string;
  createdAt: string; // data original do pedido em UTC "YYYY-MM-DD HH:MM:SS"
  customer: { name: string; email: string; phone: string; cpf: string };
  products: { id: string; name: string; quantity: number; priceInCents: number }[];
  totalInCents: number;
  trackingParams?: {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_campaign?: string | null;
    utm_medium?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date();

  const payload: UtmifyOrderPayload = {
    orderId: params.orderId,
    platform: "AchaShop",
    paymentMethod: "pix",
    status: "paid",
    createdAt: params.createdAt,
    approvedDate: formatDateUTC(now),
    refundedAt: null,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      document: params.customer.cpf,
      country: "BR",
    },
    products: params.products.map((p) => ({
      id: p.id,
      name: p.name,
      planId: null,
      planName: null,
      quantity: p.quantity,
      priceInCents: p.priceInCents,
    })),
    trackingParameters: {
      src: params.trackingParams?.src ?? null,
      sck: params.trackingParams?.sck ?? null,
      utm_source: params.trackingParams?.utm_source ?? null,
      utm_campaign: params.trackingParams?.utm_campaign ?? null,
      utm_medium: params.trackingParams?.utm_medium ?? null,
      utm_content: params.trackingParams?.utm_content ?? null,
      utm_term: params.trackingParams?.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: params.totalInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: params.totalInCents,
      currency: "BRL",
    },
  };

  return sendUtmifyOrder(payload);
}

// ============================================================
// Server-side Tracking via tracking.utmify.com.br
// Proxy para eventos de pixel (PageView, InitiateCheckout)
// Garante que os eventos são registrados mesmo quando o pixel
// é bloqueado por ad blockers no browser do visitante.
// ============================================================

interface TrackingLead {
  _id?: string;
  pixelId: string;
  userAgent: string;
  locale: string;
  ip?: string;
  parameters?: Record<string, string>;
}

interface TrackingEvent {
  pageTitle: string;
  sourceUrl: string;
}

interface TrackingResponse {
  lead?: {
    _id: string;
    [key: string]: any;
  };
  event?: {
    _id: string;
    type: string;
    [key: string]: any;
  };
}

/**
 * Envia um evento de tracking (PageView, InitiateCheckout, etc.)
 * para a API de tracking do UTMify via server-side.
 * Isso funciona como proxy para contornar ad blockers.
 */
export async function sendUtmifyTrackingEvent(params: {
  type: "PageView" | "InitiateCheckout" | "ViewContent";
  lead: TrackingLead;
  event: TrackingEvent;
  clientIp?: string;
}): Promise<{ success: boolean; lead?: any; error?: string }> {
  try {
    const leadData: any = {
      ...params.lead,
      pixelId: PIXEL_ID,
    };
    // Adicionar IP do cliente se disponível
    if (params.clientIp) {
      leadData.ip = params.clientIp;
    }

    const response = await axios.post(
      `${UTMIFY_TRACKING_URL}/events`,
      {
        type: params.type,
        lead: leadData,
        event: params.event,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const data: TrackingResponse = response.data;
    console.log(
      `[UTMify Tracking] ${params.type} sent — Lead: ${data.lead?._id}, Event: ${data.event?._id}`
    );

    return { success: true, lead: data.lead };
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message || error?.message || "Unknown error";
    console.error(
      `[UTMify Tracking] Failed to send ${params.type}: ${errorMsg}`
    );
    return { success: false, error: errorMsg };
  }
}
