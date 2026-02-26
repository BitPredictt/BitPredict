#!/bin/bash
# Add BitPredict API location to polyfantasy.xyz nginx config
CONF="/etc/nginx/conf.d/polyfantasy.conf"

# Check if already added
if grep -q "bitpredict-api" "$CONF"; then
  echo "BitPredict API location already exists in nginx config"
else
  # Add location block before the closing brace of the first server block (polyfantasy.xyz HTTPS)
  sed -i '/server_name polyfantasy.xyz;/,/^}/ {
    /location \/ {/i\
  location /bpapi/ {\
    proxy_pass http://127.0.0.1:3456/;\
    proxy_http_version 1.1;\
    proxy_set_header Host $host;\
    proxy_set_header X-Real-IP $remote_addr;\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    proxy_set_header X-Forwarded-Proto $scheme;\
    add_header Access-Control-Allow-Origin * always;\
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;\
    add_header Access-Control-Allow-Headers "Content-Type" always;\
    if ($request_method = OPTIONS) {\
      return 204;\
    }\
  } # bitpredict-api
  }' "$CONF"
  echo "Added BitPredict API location to nginx config"
fi

nginx -t && systemctl reload nginx
echo "nginx reloaded"

# Test
curl -s https://polyfantasy.xyz/bpapi/api/health
