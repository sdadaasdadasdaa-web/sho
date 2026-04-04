/**
 * Script de Geração de Pedidos para Teste
 * Envia pedidos reais para UTMify simulando o fluxo completo da loja
 *
 * Uso: node test_pedidos.mjs
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Carregar .env manualmente
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...val] = trimmed.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  }
}

const UTMIFY_API_URL = "https://api.utmify.com.br/api-credentials/orders";
const API_TOKEN = process.env.UTMIFY_API_TOKEN || "oZfYDiTBLfgN2P0UwzQimtHaMg0QJ7PUL43R";

function formatDate(date) {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

function gerarId() {
  return `ACHA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ─── Clientes fictícios ───────────────────────────────────────────────────────
const clientes = [
  { name: "Maria Oliveira",    email: "maria.oliveira@gmail.com",   phone: "11987654321", document: "529.982.247-25" },
  { name: "Carlos Souza",      email: "carlos.souza@hotmail.com",   phone: "21976543210", document: "078.009.470-38" },
  { name: "Ana Lima",          email: "ana.lima@yahoo.com.br",      phone: "31965432109", document: "457.718.920-85" },
  { name: "Pedro Alves",       email: "pedro.alves@gmail.com",      phone: "41954321098", document: "183.484.290-60" },
  { name: "Fernanda Costa",    email: "fernanda.costa@outlook.com", phone: "51943210987", document: "321.826.580-45" },
];

// ─── Produtos fictícios ───────────────────────────────────────────────────────
const produtos = [
  { id: "kit-ferramentas-pro",       name: "Kit Ferramentas Profissional 127 Peças",  priceInCents: 18990 },
  { id: "furadeira-impacto-800w",    name: "Furadeira de Impacto 800W Bosch GSB 13", priceInCents: 24990 },
  { id: "serra-circular-1400w",      name: "Serra Circular 7-1/4 1400W Makita",       priceInCents: 34990 },
  { id: "conjunto-chaves-combinadas",name: "Conjunto Chaves Combinadas 25 Peças",     priceInCents:  9990 },
  { id: "nivel-laser-profissional",  name: "Nível a Laser Profissional Bosch GLL 3-80",priceInCents: 49900 },
  { id: "parafusadeira-bateria-18v", name: "Parafusadeira a Bateria 18V DeWalt DCD771",priceInCents: 42990 },
  { id: "lixadeira-orbital-250w",    name: "Lixadeira Orbital 250W Skil 7454",        priceInCents: 16990 },
];

// ─── Fontes de tráfego ────────────────────────────────────────────────────────
const trafficSources = [
  { utm_source: "facebook",  utm_medium: "cpc",     utm_campaign: "ferramentas_remarketing", src: "fb",  sck: null },
  { utm_source: "google",    utm_medium: "cpc",     utm_campaign: "ferramentas_search",      src: "gg",  sck: null },
  { utm_source: "instagram", utm_medium: "social",  utm_campaign: "ferramentas_feed",        src: "ig",  sck: null },
  { utm_source: "tiktok",    utm_medium: "cpc",     utm_campaign: "ferramentas_tiktok",      src: "tk",  sck: null },
  { utm_source: null,        utm_medium: null,       utm_campaign: null,                      src: null,  sck: null },
];

// ─── Utilitário de envio ──────────────────────────────────────────────────────
async function enviarPedido(payload) {
  try {
    const res = await axios.post(UTMIFY_API_URL, payload, {
      headers: { "x-api-token": API_TOKEN, "Content-Type": "application/json" },
      timeout: 15000,
    });
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, status: err?.response?.status, msg: err?.response?.data?.message || err?.message };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── PEDIDOS DE TESTE ─────────────────────────────────────────────────────────
const pedidos = [
  // 1 — Pedido PENDENTE (aguardando pagamento)
  {
    label: "Pedido PENDENTE — Kit Ferramentas (Facebook Ads)",
    cliente: clientes[0],
    produto: produtos[0],
    qtd: 1,
    traffic: trafficSources[0],
    status: "waiting_payment",
  },
  // 2 — Pedido PAGO (furadeira)
  {
    label: "Pedido PAGO — Furadeira de Impacto (Google Ads)",
    cliente: clientes[1],
    produto: produtos[1],
    qtd: 1,
    traffic: trafficSources[1],
    status: "paid",
  },
  // 3 — Pedido PAGO — 2 unidades
  {
    label: "Pedido PAGO — Chaves Combinadas x2 (Instagram)",
    cliente: clientes[2],
    produto: produtos[3],
    qtd: 2,
    traffic: trafficSources[2],
    status: "paid",
  },
  // 4 — Pedido PENDENTE — produto de ticket alto
  {
    label: "Pedido PENDENTE — Nível Laser (TikTok Ads)",
    cliente: clientes[3],
    produto: produtos[4],
    qtd: 1,
    traffic: trafficSources[3],
    status: "waiting_payment",
  },
  // 5 — Pedido PAGO — tráfego orgânico
  {
    label: "Pedido PAGO — Parafusadeira Bateria (Orgânico)",
    cliente: clientes[4],
    produto: produtos[5],
    qtd: 1,
    traffic: trafficSources[4],
    status: "paid",
  },
];

// ─── Execução ─────────────────────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("  GERADOR DE PEDIDOS DE TESTE — AchaShop");
console.log("=".repeat(60));
console.log(`Token UTMify: ${API_TOKEN.substring(0, 10)}...`);
console.log(`Total de pedidos a enviar: ${pedidos.length}`);
console.log("");

let ok = 0, fail = 0;

for (const p of pedidos) {
  const orderId = gerarId();
  const now = new Date();
  const createdAt = formatDate(now);
  const totalInCents = p.produto.priceInCents * p.qtd;

  const payload = {
    orderId,
    platform: "AchaShop",
    paymentMethod: "pix",
    status: p.status,
    createdAt,
    approvedDate: p.status === "paid" ? createdAt : null,
    refundedAt: null,
    customer: {
      name:     p.cliente.name,
      email:    p.cliente.email,
      phone:    p.cliente.phone,
      document: p.cliente.document,
      country:  "BR",
    },
    products: [
      {
        id:        p.produto.id,
        name:      p.produto.name,
        planId:    null,
        planName:  null,
        quantity:  p.qtd,
        priceInCents: p.produto.priceInCents,
      },
    ],
    trackingParameters: {
      src:          p.traffic.src,
      sck:          p.traffic.sck,
      utm_source:   p.traffic.utm_source,
      utm_campaign: p.traffic.utm_campaign,
      utm_medium:   p.traffic.utm_medium,
      utm_content:  null,
      utm_term:     null,
    },
    commission: {
      totalPriceInCents:    totalInCents,
      gatewayFeeInCents:    0,
      userCommissionInCents: totalInCents,
      currency: "BRL",
    },
    isTest: false,
  };

  process.stdout.write(`\n[${pedidos.indexOf(p) + 1}/${pedidos.length}] ${p.label}\n`);
  process.stdout.write(`    ID: ${orderId} | Status: ${p.status.toUpperCase()} | Valor: R$ ${(totalInCents / 100).toFixed(2)}\n`);
  process.stdout.write(`    Enviando... `);

  const res = await enviarPedido(payload);

  if (res.ok) {
    console.log(`✅ Sucesso (HTTP ${res.status})`);
    ok++;
  } else {
    console.log(`❌ Erro (HTTP ${res.status ?? "?"}) — ${res.msg}`);
    fail++;
  }

  await sleep(600); // respeitar rate limit da API
}

console.log("\n" + "=".repeat(60));
console.log(`  RESULTADO FINAL: ${ok} enviados com sucesso, ${fail} com erro`);
console.log("=".repeat(60));
if (ok > 0) {
  console.log("\n✅ Verifique os pedidos no painel UTMify em alguns instantes.");
}
