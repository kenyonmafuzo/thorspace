/**
 * mpCredentials.js
 *
 * Centraliza a seleção de credenciais do Mercado Pago entre produção e sandbox.
 *
 * Para ativar o modo teste:
 *   Adicione em .env.local:
 *     MP_TEST_MODE=true
 *     MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-xxxx...
 *
 * Para voltar para produção (ou em Vercel/produção):
 *     MP_TEST_MODE=false  (ou simplesmente não definir)
 */

export function getMpAccessToken() {
  const isTest = process.env.MP_TEST_MODE === "true";
  const token = isTest
    ? process.env.MERCADOPAGO_TEST_ACCESS_TOKEN
    : process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      `MP access token não configurado — esperado: ${
        isTest ? "MERCADOPAGO_TEST_ACCESS_TOKEN" : "MERCADOPAGO_ACCESS_TOKEN"
      }`
    );
  }

  return token;
}

export function isMpTestMode() {
  return process.env.MP_TEST_MODE === "true";
}
