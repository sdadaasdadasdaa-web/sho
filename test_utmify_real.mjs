import axios from "axios";

const UTMIFY_API_URL = "https://api.utmify.com.br/api-credentials/orders";
const API_TOKEN = process.env.UTMIFY_API_TOKEN || "oZfYDiTBLfgN2P0UwzQimtHaMg0QJ7PUL43R";

const now = new Date();
const createdAt = now.toISOString().replace("T", " ").substring(0, 19);

const payload = {
  orderId: `TEST-${Date.now()}`,
  platform: "AchaShop",
  paymentMethod: "pix",
  status: "waiting_payment",
  createdAt: createdAt,
  approvedDate: null,
  refundedAt: null,
  customer: {
    name: "João Teste",
    email: "joao@teste.com",
    phone: "11999999999",
    document: "12345678901",
    country: "BR",
    ip: "127.0.0.1"
  },
  products: [
    {
      id: "rocadeira-21",
      name: "Roçadeira Multifuncional 75cc Nakasaki",
      planId: null,
      planName: null,
      quantity: 1,
      priceInCents: 8990
    }
  ],
  trackingParameters: {
    src: null,
    sck: null,
    utm_source: "facebook",
    utm_campaign: "rocadeira_test",
    utm_medium: "cpc",
    utm_content: null,
    utm_term: null
  },
  commission: {
    totalPriceInCents: 8990,
    gatewayFeeInCents: 0,
    userCommissionInCents: 8990,
    currency: "BRL"
  },
  isTest: false
};

console.log("=== Enviando pedido PENDENTE para UTMify ===");
console.log("URL:", UTMIFY_API_URL);
console.log("Token:", API_TOKEN.substring(0, 10) + "...");
console.log("Payload:", JSON.stringify(payload, null, 2));

try {
  const response = await axios.post(UTMIFY_API_URL, payload, {
    headers: {
      "x-api-token": API_TOKEN,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  console.log("\n=== RESPOSTA SUCESSO ===");
  console.log("Status HTTP:", response.status);
  console.log("Data:", JSON.stringify(response.data, null, 2));
} catch (error) {
  console.log("\n=== RESPOSTA ERRO ===");
  console.log("Status HTTP:", error?.response?.status);
  console.log("Data:", JSON.stringify(error?.response?.data, null, 2));
  console.log("Message:", error?.message);
  console.log("Headers enviados:", JSON.stringify(error?.config?.headers, null, 2));
}

// Agora testar com status "paid"
const paidPayload = {
  ...payload,
  orderId: payload.orderId, // mesmo orderId
  status: "paid",
  approvedDate: createdAt,
};

console.log("\n\n=== Enviando pedido PAGO para UTMify ===");
console.log("Payload:", JSON.stringify(paidPayload, null, 2));

try {
  const response2 = await axios.post(UTMIFY_API_URL, paidPayload, {
    headers: {
      "x-api-token": API_TOKEN,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  console.log("\n=== RESPOSTA SUCESSO ===");
  console.log("Status HTTP:", response2.status);
  console.log("Data:", JSON.stringify(response2.data, null, 2));
} catch (error) {
  console.log("\n=== RESPOSTA ERRO ===");
  console.log("Status HTTP:", error?.response?.status);
  console.log("Data:", JSON.stringify(error?.response?.data, null, 2));
  console.log("Message:", error?.message);
}
