#!/bin/bash
cd /root/bitpredict-server
pkill -f "node index" 2>/dev/null || true
sleep 1
nohup node index.js > /var/log/bitpredict.log 2>&1 &
sleep 3
curl -s http://localhost:3456/api/health
echo ""
echo "PID: $(pgrep -f 'node index')"
