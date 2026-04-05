import { ENV } from "./_core/env";

const SIGILO_PAY_BASE_URL = "https://app.sigilopay.com.br/api/v1";

export interface SigiloPayClient {
  name: string;
  email: string;
  phone: string;
  document: string; // CPF com ou sem pontuação
}

export interface SigiloPayProduct {
  id: string;
  name: string;
  quantity: number;
  price: number; // em reais
}

export interface CreatePixInput {
  identifier: string;
  amount: number; // em reais
  shippingFee?: number; // em reais
  discount?: number; // em reais
  client: SigiloPayClient;
  products?: SigiloPayProduct[];
  dueDate?: string; // YYYY-MM-DD
  metadata?: Record<string, string>;
  callbackUrl?: string;
}

export interface SigiloPayPixResponse {
  transactionId: string;
  status: string; // OK, FAILED, PENDING, REJECTED, CANCELED
  fee?: number;
  order?: {
    id: string;
    url: string;
    receiptUrl: string;
  };
  pix?: {
    code: string; // PIX copia e cola
    base64: string; // QR code em base64
    image: string; // URL da imagem do QR code
  };
  details?: string;
  errorDescription?: string;
}

export interface SigiloPayTransactionResponse {
  id: string;
  clientIdentifier: string;
  currency: string;
  amount: number;
  chargeAmount: number;
  status: string; // PENDING, COMPLETED, FAILED, REFUNDED, CHARGED_BACK
  statusDescription?: string;
  paymentMethod: string;
  details?: string;
  errorDescription?: string;
  createdAt: string;
  payedAt?: string;
  refundedAt?: string;
  pixInformation?: {
    base64: string | null;
    qrCode: string | null;
    image: string | null;
  };
}

function getHeaders() {
  return {
    "x-public-key": ENV.sigiloPayPublicKey,
    "x-secret-key": ENV.sigiloPaySecretKey,
    "Content-Type": "application/json",
  };
}

export async function createPixTransaction(
  input: CreatePixInput
): Promise<SigiloPayPixResponse> {
  const body: Record<string, unknown> = {
    identifier: input.identifier,
    amount: input.amount,
    client: input.client,
  };

  if (input.shippingFee !== undefined) body.shippingFee = input.shippingFee;
  if (input.discount !== undefined) body.discount = input.discount;
  if (input.products) body.products = input.products;
  if (input.dueDate) body.dueDate = input.dueDate;
  if (input.metadata) body.metadata = input.metadata;
  if (input.callbackUrl) body.callbackUrl = input.callbackUrl;

  console.log(`[SigiloPay] Creating PIX transaction: identifier=${body.identifier}, amount=${body.amount}`);

  const response = await fetch(`${SIGILO_PAY_BASE_URL}/gateway/pix/receive`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    console.error(`[SigiloPay] Non-JSON response: status=${response.status}`);
    throw new Error(
      "Servidor de pagamento retornou resposta inválida. Tente novamente em alguns minutos."
    );
  }

  if (!response.ok) {
    console.error("[SigiloPay] Error creating transaction:", JSON.stringify(data));
    const errorMsg = data?.message || "";
    const errorCode = data?.errorCode || "";
    
    // Mapear erros da Sigilo Pay para mensagens amigáveis
    if (errorMsg.includes("Documento") || errorMsg.includes("documento") || errorMsg.includes("document")) {
      throw new Error("CPF inválido. Verifique os números e tente novamente.");
    }
    if (errorMsg.includes("Invalid products") || errorMsg.includes("products")) {
      throw new Error("Erro ao processar produtos. Tente novamente.");
    }
    if (errorMsg.includes("amount") || errorMsg.includes("valor")) {
      throw new Error("Valor do pedido inválido. Tente novamente.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Credenciais do gateway de pagamento inválidas.");
    }
    if (response.status >= 500) {
      throw new Error("Servidor de pagamento temporariamente indisponível. Tente novamente em alguns minutos.");
    }
    throw new Error(
      `Erro ao processar pagamento: ${errorMsg || response.status}. Verifique seus dados e tente novamente.`
    );
  }

  console.log("[SigiloPay] Transaction created:", JSON.stringify({
    transactionId: data.transactionId,
    status: data.status,
    hasPixCode: !!data.pix?.code,
    hasPixBase64: !!data.pix?.base64,
    orderId: data.order?.id,
  }));
  return data as SigiloPayPixResponse;
}

export async function getTransactionStatus(
  transactionId: string
): Promise<SigiloPayTransactionResponse> {
  const response = await fetch(
    `${SIGILO_PAY_BASE_URL}/gateway/transactions?id=${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  let data: any;
  try {
    data = await response.json();
  } catch {
    console.error(`[SigiloPay] Non-JSON response on status check: status=${response.status}`);
    throw new Error(
      `Erro ao consultar transação: resposta inválida (${response.status})`
    );
  }

  if (!response.ok) {
    console.error("[SigiloPay] Error fetching transaction:", JSON.stringify(data));
    throw new Error(
      data?.message || `Erro ao consultar transação: ${response.status}`
    );
  }

  return data as SigiloPayTransactionResponse;
}

export async function testCredentials(): Promise<boolean> {
  try {
    const response = await fetch(
      `${SIGILO_PAY_BASE_URL}/gateway/credentials/test`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
