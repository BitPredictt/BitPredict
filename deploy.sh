#!/bin/bash
# Quick deploy BitPredict to VPS
set -e
SSH_KEY="../.ssh_vps_key"
VPS="root@188.137.250.160"

echo "Building..."
npx vite build

echo "Packaging..."
tar -czf dist.tar.gz -C dist .

echo "Uploading..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no dist.tar.gz "$VPS:/tmp/bitpredict.tar.gz"

echo "Deploying..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS" \
  "cd /var/www/bitpredict && rm -rf * && tar xzf /tmp/bitpredict.tar.gz && echo 'Live at http://188.137.250.160/'"

rm -f dist.tar.gz
echo "Done!"
