/**
 * Script de Geração de Pedidos com QR Code PIX Real — Sigilo Pay + UTMify
 * Simula exatamente o fluxo do cliente no site:
 *   1. Cria transação PIX na Sigilo Pay (gera QR Code real)
 *   2. Envia notificação "waiting_payment" para UTMify
 *   3. Exibe o QR Code e código PIX no terminal
 *
 * Uso: node test_pedidos_sigilopay.mjs
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Carregar .env ────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [k, ...v] = t.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const SIGILO_BASE   = "https://app.sigilopay.com.br/api/v1";
const UTMIFY_URL    = "https://api.utmify.com.br/api-credentials/orders";
const PUBLIC_KEY    = process.env.SIGILO_PAY_PUBLIC_KEY;
const SECRET_KEY    = process.env.SIGILO_PAY_SECRET_KEY;
const UTMIFY_TOKEN  = process.env.UTMIFY_API_TOKEN;

if (!PUBLIC_KEY || !SECRET_KEY) {
  console.error("❌ SIGILO_PAY_PUBLIC_KEY ou SIGILO_PAY_SECRET_KEY não definidos no .env");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d) {
  return d.toISOString().replace("T", " ").substring(0, 19);
}

function gerarRef() {
  return `ACHA-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Pedidos de teste ─────────────────────────────────────────────────────────
const pedidos = [
  {
    label: "Furadeira de Impacto 800W — Maria Oliveira (Facebook Ads)",
    customer: {
      name:     "Maria Oliveira",
      email:    "maria.oliveira.teste@gmail.com",
      phone:    "(11) 98765-4321",
      document: "529.982.247-25",
    },
    amountReais: 249.90,
    tracking: {
      utm_source: "facebook", utm_medium: "cpc",
      utm_campaign: "ferramentas_remarketing", src: "fb",
    },
    productName: "Furadeira de Impacto 800W Bosch GSB 13",
  },
  {
    label: "Kit Ferramentas 127 Peças — Carlos Souza (Google Ads)",
    customer: {
      name:     "Carlos Souza",
      email:    "carlos.souza.teste@hotmail.com",
      phone:    "(21) 97654-3210",
      document: "111.444.777-35",
    },
    amountReais: 189.90,
    tracking: {
      utm_source: "google", utm_medium: "cpc",
      utm_campaign: "ferramentas_search", src: "gg",
    },
    productName: "Kit Ferramentas Profissional 127 Peças",
  },
  {
    label: "Nível a Laser Profissional — Ana Lima (Instagram)",
    customer: {
      name:     "Ana Lima",
      email:    "ana.lima.teste@yahoo.com.br",
      phone:    "(31) 96543-2109",
      document: "987.654.321-00",
    },
    amountReais: 499.00,
    tracking: {
      utm_source: "instagram", utm_medium: "social",
      utm_campaign: "ferramentas_feed", src: "ig",
    },
    productName: "Nível a Laser Profissional Bosch GLL 3-80",
  },
];

// ─── Criar PIX na Sigilo Pay ──────────────────────────────────────────────────
async function criarPix(pedido, externalRef) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const body = {
    identifier: externalRef,
    amount:     pedido.amountReais,
    client: {
      name:     pedido.customer.name,
      email:    pedido.customer.email,
      phone:    pedido.customer.phone,
      document: pedido.customer.document,
    },
    dueDate: dueDate.toISOString().split("T")[0],
    metadata: {
      order_number: externalRef,
      product:      pedido.productName,
    },
  };

  const res = await fetch(`${SIGILO_BASE}/gateway/pix/receive`, {
    method: "POST",
    headers: {
      "x-public-key":  PUBLIC_KEY,
      "x-secret-key":  SECRET_KEY,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Sigilo Pay erro ${res.status}: ${data?.message || JSON.stringify(data)}`);
  }

  return data;
}

// ─── Enviar pending para UTMify ───────────────────────────────────────────────
async function enviarUtmifyPendente(pedido, externalRef) {
  if (!UTMIFY_TOKEN) return { ok: false, msg: "Token UTMify não definido" };

  const now = new Date();
  const payload = {
    orderId:        externalRef,
    platform:       "AchaShop",
    paymentMethod:  "pix",
    status:         "waiting_payment",
    createdAt:      formatDate(now),
    approvedDate:   null,
    refundedAt:     null,
    customer: {
      name:     pedido.customer.name,
      email:    pedido.customer.email,
      phone:    pedido.customer.phone.replace(/\D/g, ""),
      document: pedido.customer.document,
      country:  "BR",
    },
    products: [{
      id:           pedido.productName.toLowerCase().replace(/\s+/g, "-").substring(0, 30),
      name:         pedido.productName,
      planId:       null,
      planName:     null,
      quantity:     1,
      priceInCents: Math.round(pedido.amountReais * 100),
    }],
    trackingParameters: {
      src:          pedido.tracking.src   ?? null,
      sck:          null,
      utm_source:   pedido.tracking.utm_source   ?? null,
      utm_campaign: pedido.tracking.utm_campaign ?? null,
      utm_medium:   pedido.tracking.utm_medium   ?? null,
      utm_content:  null,
      utm_term:     null,
    },
    commission: {
      totalPriceInCents:     Math.round(pedido.amountReais * 100),
      gatewayFeeInCents:     0,
      userCommissionInCents: Math.round(pedido.amountReais * 100),
      currency: "BRL",
    },
    isTest: false,
  };

  try {
    const r = await axios.post(UTMIFY_URL, payload, {
      headers: { "x-api-token": UTMIFY_TOKEN, "Content-Type": "application/json" },
      timeout: 12000,
    });
    return { ok: true, status: r.status };
  } catch (e) {
    return { ok: false, status: e?.response?.status, msg: e?.response?.data?.message || e?.message };
  }
}

// ─── Exibir QR Code ASCII simples ────────────────────────────────────────────
function exibirPixCode(pixCode) {
  if (!pixCode) return;
  const max = 80;
  console.log("\n  📋 Código PIX (copia e cola):");
  // exibir em blocos de 80 chars para caber no terminal
  for (let i = 0; i < pixCode.length; i += max) {
    console.log("  " + pixCode.substring(i, i + max));
  }
}

// ─── Execução principal ───────────────────────────────────────────────────────
console.log("=".repeat(65));
console.log("  TESTE DE PEDIDOS REAIS — Sigilo Pay + UTMify");
console.log("=".repeat(65));
console.log(`  Public Key : ${PUBLIC_KEY.substring(0, 15)}...`);
console.log(`  Secret Key : ${SECRET_KEY.substring(0, 10)}...`);
console.log(`  UTMify Token: ${UTMIFY_TOKEN ? UTMIFY_TOKEN.substring(0, 10) + "..." : "NÃO DEFINIDO"}`);
console.log(`  Total de pedidos: ${pedidos.length}`);
console.log("");

const resultados = [];

for (let i = 0; i < pedidos.length; i++) {
  const p = pedidos[i];
  const ref = gerarRef();

  console.log(`${"─".repeat(65)}`);
  console.log(`[${i + 1}/${pedidos.length}] ${p.label}`);
  console.log(`  Ref: ${ref} | Valor: R$ ${p.amountReais.toFixed(2)}`);

  // 1. Criar PIX
  process.stdout.write("  [1/2] Criando transação PIX na Sigilo Pay... ");
  let pixData = null;
  try {
    pixData = await criarPix(p, ref);
    console.log(`✅ OK`);
    console.log(`       Transaction ID : ${pixData.transactionId}`);
    console.log(`       Status Sigilo   : ${pixData.status}`);
    console.log(`       QR Code gerado  : ${pixData.pix?.code ? "SIM ✅" : "NÃO ❌"}`);
    exibirPixCode(pixData.pix?.code);
  } catch (err) {
    console.log(`❌ ERRO: ${err.message}`);
    resultados.push({ ref, ok: false, etapa: "SigiloPay", erro: err.message });
    await sleep(800);
    continue;
  }

  // 2. Notificar UTMify
  process.stdout.write("\n  [2/2] Enviando notificação pending para UTMify...  ");
  const utm = await enviarUtmifyPendente(p, ref);
  if (utm.ok) {
    console.log(`✅ OK (HTTP ${utm.status})`);
  } else {
    console.log(`⚠️  Erro UTMify (HTTP ${utm.status ?? "?"}) — ${utm.msg}`);
  }

  resultados.push({
    ref,
    transactionId: pixData.transactionId,
    valor: `R$ ${p.amountReais.toFixed(2)}`,
    cliente: p.customer.name,
    sigiloPay: "✅",
    utmify: utm.ok ? "✅" : "⚠️",
    pixCode: pixData.pix?.code ? pixData.pix.code.substring(0, 30) + "..." : "N/A",
  });

  await sleep(1200); // pausa entre pedidos
}

// ─── Resumo final ─────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(65)}`);
console.log("  RESUMO DOS PEDIDOS GERADOS");
console.log("=".repeat(65));
for (const r of resultados) {
  if (!r.ok && r.etapa) {
    console.log(`❌ ${r.ref} — FALHOU em ${r.etapa}: ${r.erro}`);
  } else {
    console.log(`✅ ${r.ref} | ${r.cliente} | ${r.valor}`);
    console.log(`     Transaction ID: ${r.transactionId}`);
    console.log(`     Sigilo Pay: ${r.sigiloPay}  |  UTMify: ${r.utmify}`);
    console.log(`     PIX: ${r.pixCode}`);
  }
}
const totalOk = resultados.filter(r => r.transactionId).length;
console.log(`\n  ${totalOk}/${pedidos.length} pedidos criados com sucesso.`);
console.log("=".repeat(65));
