import { NextResponse } from "next/server";
import { getMpAccessToken } from "@/lib/mpCredentials";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("payment_id");

  if (!paymentId) {
    return NextResponse.json({ error: "payment_id obrigatório" }, { status: 400 });
  }

  let ACCESS_TOKEN;
  try {
    ACCESS_TOKEN = getMpAccessToken();
  } catch (e) {
    return NextResponse.json({ error: "Configuração indisponível" }, { status: 500 });
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Falha ao consultar pagamento" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    status: data.status,
    status_detail: data.status_detail,
  });
}
