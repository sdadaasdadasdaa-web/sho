/*
 * UTMify Tracker — Integração para SPA (React + wouter)
 * 
 * Estratégia de tracking em 2 camadas:
 * 
 * 1. PIXEL CLIENT-SIDE (pixel.js):
 *    - Carregado via <script> no index.html
 *    - Dispara PageView na primeira carga, ViewContent, e detecta IC automaticamente
 *    - Pode ser bloqueado por ad blockers
 * 
 * 2. PROXY SERVER-SIDE (este módulo):
 *    - Envia eventos via tRPC → backend → tracking.utmify.com.br
 *    - NÃO pode ser bloqueado por ad blockers (vai pelo nosso servidor)
 *    - Garante que PageView e IC são sempre registrados
 *    - Salva o lead no localStorage para uso posterior
 * 
 * O utms/latest.js salva UTMs no localStorage:
 *   utm_source, utm_campaign, utm_medium, utm_content, utm_term, xcod, src
 *   (NÃO salva sck — precisamos salvar manualmente)
 */
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const PIXEL_ID = "69251f2e83c0b0e4729553f9";

/**
 * Lê o lead salvo pelo pixel UTMify ou pelo nosso proxy no localStorage
 */
function getUtmifyLead(): any {
  try {
    const raw = localStorage.getItem("lead");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

/**
 * Salva o sck no localStorage (utms/latest.js não salva sck)
 * Chamado na primeira carga da página quando sck está na URL
 */
function persistSckFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sck = urlParams.get("sck");
    if (sck) {
      localStorage.setItem("sck", sck);
      // Setar expiração de 7 dias (mesmo padrão do utms/latest.js)
      const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      localStorage.setItem("sck_exp", exp.toISOString());
    }
  } catch {
    // ignore
  }
}

/**
 * Hook que dispara PageView via proxy server-side em cada navegação SPA.
 * Na primeira carga, o pixel.js tenta enviar diretamente, mas nosso proxy
 * garante que o evento é registrado mesmo se o pixel for bloqueado.
 */
export function useUtmifyPageView() {
  const [location] = useLocation();
  const lastTrackedPath = useRef("");
  const isFirstLoad = useRef(true);

  const sendEventMutation = trpc.tracking.sendEvent.useMutation();

  useEffect(() => {
    // Na primeira carga, persistir sck da URL
    if (isFirstLoad.current) {
      persistSckFromUrl();
    }

    // Evitar duplicatas na mesma rota
    if (location === lastTrackedPath.current && !isFirstLoad.current) return;
    lastTrackedPath.current = location;

    const isFirst = isFirstLoad.current;
    isFirstLoad.current = false;

    // Pequeno delay para garantir que o DOM e o título foram atualizados
    const timer = setTimeout(() => {
      const lead = getUtmifyLead();

      sendEventMutation.mutate(
        {
          type: "PageView",
          lead: {
            _id: lead?._id || undefined,
            userAgent: navigator.userAgent,
            locale: navigator.language,
            parameters: lead?.parameters || undefined,
          },
          event: {
            pageTitle: document.title,
            sourceUrl: window.location.href,
          },
        },
        {
          onSuccess: (data) => {
            if (data.success && data.lead?._id) {
              // Salvar/atualizar o lead no localStorage
              localStorage.setItem("lead", JSON.stringify(data.lead));
              console.log(
                `[UTMify Proxy] PageView registrado para: ${window.location.pathname} (lead: ${data.lead._id})`
              );
            }
          },
          onError: (err) => {
            console.warn("[UTMify Proxy] Erro ao enviar PageView:", err.message);
          },
        }
      );
    }, isFirst ? 1500 : 500); // Mais delay na primeira carga para dar tempo ao pixel

    return () => clearTimeout(timer);
  }, [location]);
}

/**
 * Envia um evento de InitiateCheckout via proxy server-side.
 * Chamado quando o usuário clica em "Comprar Agora" ou vai para o checkout.
 */
export function useSendInitiateCheckout() {
  const sendEventMutation = trpc.tracking.sendEvent.useMutation();

  return () => {
    const lead = getUtmifyLead();

    sendEventMutation.mutate(
      {
        type: "InitiateCheckout",
        lead: {
          _id: lead?._id || undefined,
          userAgent: navigator.userAgent,
          locale: navigator.language,
          parameters: lead?.parameters || undefined,
        },
        event: {
          pageTitle: document.title,
          sourceUrl: window.location.href,
        },
      },
      {
        onSuccess: (data) => {
          if (data.success && data.lead?._id) {
            localStorage.setItem("lead", JSON.stringify(data.lead));
            console.log(
              `[UTMify Proxy] InitiateCheckout registrado (lead: ${data.lead._id})`
            );
          }
        },
        onError: (err) => {
          console.warn("[UTMify Proxy] Erro ao enviar IC:", err.message);
        },
      }
    );
  };
}

/**
 * Utilitário para ler os parâmetros UTM salvos pelo script utms/latest.js
 * e pelo pixel UTMify. Esses valores são necessários para o backend
 * enviar eventos de venda para a UTMify.
 * 
 * O script utms/latest.js salva UTMs no localStorage com as chaves:
 * utm_source, utm_campaign, utm_medium, utm_content, utm_term, xcod, src
 * (com expiração de 7 dias)
 * 
 * O pixel salva o lead no localStorage com key "lead", que contém
 * parameters com src/sck.
 * 
 * O utms/latest.js também seta window.utmParams com todos os valores.
 */
export function getUtmifyTrackingParams(): {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
} {
  // 1. Ler da URL atual (prioridade máxima)
  const urlParams = new URLSearchParams(window.location.search);
  
  // 2. Ler do localStorage (onde utms/latest.js salva diretamente)
  const lsGet = (key: string): string | null => {
    try {
      const val = localStorage.getItem(key);
      // Verificar se não expirou
      const expKey = `${key}_exp`;
      const exp = localStorage.getItem(expKey);
      if (exp && new Date(exp) < new Date()) {
        return null; // expirado
      }
      return val || null;
    } catch {
      return null;
    }
  };

  // 3. Ler do lead no localStorage (onde o pixel salva src/sck)
  const lead = getUtmifyLead();
  const leadParams = lead?.parameters || {};

  // 4. Ler de window.utmParams (setado pelo utms/latest.js)
  const utmParams = (window as any).utmParams;
  const wpGet = (key: string): string | null => {
    if (!utmParams) return null;
    if (typeof utmParams.get === "function") return utmParams.get(key) || null;
    return utmParams[key] || null;
  };

  // Prioridade: URL params > localStorage (utms/latest.js) > window.utmParams > lead localStorage
  return {
    src: urlParams.get("src") || lsGet("src") || wpGet("src") || leadParams.src || null,
    sck: urlParams.get("sck") || lsGet("sck") || wpGet("sck") || leadParams.sck || null,
    utm_source: urlParams.get("utm_source") || lsGet("utm_source") || wpGet("utm_source") || leadParams.utm_source || null,
    utm_campaign: urlParams.get("utm_campaign") || lsGet("utm_campaign") || wpGet("utm_campaign") || leadParams.utm_campaign || null,
    utm_medium: urlParams.get("utm_medium") || lsGet("utm_medium") || wpGet("utm_medium") || leadParams.utm_medium || null,
    utm_content: urlParams.get("utm_content") || lsGet("utm_content") || wpGet("utm_content") || leadParams.utm_content || null,
    utm_term: urlParams.get("utm_term") || lsGet("utm_term") || wpGet("utm_term") || leadParams.utm_term || null,
  };
}

/**
 * Componente wrapper que ativa o tracking em todas as páginas
 */
export default function UtmifyTracker() {
  useUtmifyPageView();
  return null;
}
