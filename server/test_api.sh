#!/bin/bash
echo "=== Testing BitPredict API ==="
BASE="http://127.0.0.1:3456"

echo -e "\n1. Health check:"
curl -s "$BASE/api/health"

echo -e "\n\n2. Auth (create user):"
curl -s -X POST "$BASE/api/auth" -H 'Content-Type: application/json' -d '{"address":"test-wallet-xyz"}'

echo -e "\n\n3. Balance:"
curl -s "$BASE/api/balance/test-wallet-xyz"

echo -e "\n\n4. Markets count:"
curl -s "$BASE/api/markets" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} markets')"

echo -e "\n\n5. Active markets (first 3):"
curl -s "$BASE/api/markets" | python3 -c "
import json,sys
d=json.load(sys.stdin)
active=[m for m in d if not m['resolved']]
for m in active[:3]:
    print(f\"  {m['id']}: {m['question'][:60]}... yes={m['yesPrice']} no={m['noPrice']}\")
print(f'  Total active: {len(active)}')
"

echo -e "\n6. Place bet on first active market:"
MARKET_ID=$(curl -s "$BASE/api/markets" | python3 -c "import json,sys; d=json.load(sys.stdin); active=[m for m in d if not m['resolved']]; print(active[0]['id'] if active else '')")
echo "  Market: $MARKET_ID"
if [ -n "$MARKET_ID" ]; then
  curl -s -X POST "$BASE/api/bet" -H 'Content-Type: application/json' \
    -d "{\"address\":\"test-wallet-xyz\",\"marketId\":\"$MARKET_ID\",\"side\":\"yes\",\"amount\":1000}"
fi

echo -e "\n\n7. User bets:"
curl -s "$BASE/api/bets/test-wallet-xyz" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} bets'); [print(f\"  {b['id']}: {b['side']} {b['amount']} PRED on {b['marketId']}\") for b in d[:3]]"

echo -e "\n\n8. Leaderboard:"
curl -s "$BASE/api/leaderboard" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f\"  #{l['rank']} {l['address'][:20]}... bal={l['balance']} bets={l['totalBets']}\") for l in d[:5]]"

echo -e "\n\n9. Prices:"
curl -s "$BASE/api/prices"

echo -e "\n\n=== All tests done ==="
