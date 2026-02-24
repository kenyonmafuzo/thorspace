import urllib.request, json, ssl, os, sys

token = os.popen("grep 'MERCADOPAGO_TEST_ACCESS_TOKEN' .env.local | cut -d= -f2").read().strip()
print(f"Token: {token[:20]}...")

ctx = ssl.create_default_context()
payload = {
    "items": [{"id": "1day", "title": "THORSPACE VIP 1 Dia", "description": "VIP 1 dia",
                "quantity": 1, "currency_id": "BRL", "unit_price": 4.90, "category_id": "services"}],
    "payer": {"email": "test_user_123@testuser.com"},
    "back_urls": {"success": "http://localhost:3000/vip/success",
                  "failure": "http://localhost:3000/vip/failure",
                  "pending": "http://localhost:3000/vip/pending"},
    # auto_return omitted in test mode
    "notification_url": "https://thorspace.vercel.app/api/mp/webhook",
    "external_reference": "test:1day",
    "statement_descriptor": "THORSPACE VIP",
    "payment_methods": {"installments": 12},
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    "https://api.mercadopago.com/checkout/preferences",
    data=data,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
)

try:
    r = urllib.request.urlopen(req, context=ctx)
    res = json.loads(r.read())
    print("✅ OK — init_point:", res.get("init_point", "")[:80])
    print("   sandbox_init_point:", res.get("sandbox_init_point", "")[:80])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"❌ HTTP {e.code}: {body[:400]}")
except Exception as e:
    print(f"❌ ERROR: {e}")
