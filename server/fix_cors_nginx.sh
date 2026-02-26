#!/bin/bash
# Fix double CORS headers - remove from nginx since Express cors() already handles it
CONF="/etc/nginx/conf.d/polyfantasy.conf"

# Remove CORS-related lines from the bpapi location block
sed -i '/# bitpredict-api/,/^$/ { /add_header Access-Control/d; /if (\$request_method = OPTIONS)/,/}/d; }' "$CONF"

# Simpler approach: rewrite the entire bpapi block
# First remove existing bpapi block
sed -i '/location \/bpapi\//,/} # bitpredict-api/d' "$CONF"

# Re-add clean block (without CORS headers since Express handles it)
sed -i '/server_name polyfantasy.xyz;/,/^}/ {
  /location \/ {/i\
  location /bpapi/ {\
    proxy_pass http://127.0.0.1:3456/;\
    proxy_http_version 1.1;\
    proxy_set_header Host $host;\
    proxy_set_header X-Real-IP $remote_addr;\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    proxy_set_header X-Forwarded-Proto $scheme;\
  } # bitpredict-api
}' "$CONF"

echo "Testing nginx config..."
nginx -t && systemctl reload nginx
echo "Done. Testing CORS headers:"
curl -sI -X OPTIONS -H "Origin: https://opbitpredict.github.io" https://polyfantasy.xyz/bpapi/api/health 2>&1 | grep -i "access-control"
echo "---"
curl -sI -H "Origin: https://opbitpredict.github.io" https://polyfantasy.xyz/bpapi/api/health 2>&1 | grep -i "access-control"
