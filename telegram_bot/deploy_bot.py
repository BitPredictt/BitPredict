"""Deploy BitPredict Telegram bot to VPS via SSH."""
import subprocess
import sys
import os

VPS = "188.137.250.160"
SSH_KEY = os.path.join(os.path.dirname(__file__), "..", "..", ".ssh_vps_key")
REMOTE_DIR = "/root/bitpredict_bot"
BOT_TOKEN = os.environ.get("BITPREDICT_TG_TOKEN", "")
LOCAL_DIR = os.path.dirname(__file__)

def ssh(cmd: str, check=True):
    full = f'ssh -i "{SSH_KEY}" -o StrictHostKeyChecking=no root@{VPS} "{cmd}"'
    print(f"$ {cmd}")
    r = subprocess.run(full, shell=True, capture_output=True, text=True)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.stderr.strip():
        print(r.stderr.strip())
    if check and r.returncode != 0:
        print(f"WARN: exit code {r.returncode}")
    return r

def scp(local: str, remote: str):
    full = f'scp -i "{SSH_KEY}" -o StrictHostKeyChecking=no "{local}" root@{VPS}:{remote}'
    print(f"SCP: {local} -> {remote}")
    subprocess.run(full, shell=True, check=True)

def main():
    token = BOT_TOKEN
    if not token:
        print("ERROR: BITPREDICT_TG_TOKEN not set!")
        sys.exit(1)

    print("=== Deploying BitPredict Bot to VPS ===")

    # Stop existing bot
    ssh("pkill -f 'python.*bitpredict.*bot' || true", check=False)
    ssh("systemctl stop bitpredict-bot 2>/dev/null || true", check=False)

    # Create remote dir
    ssh(f"mkdir -p {REMOTE_DIR}")

    # Upload files
    for f in ["bot.py", "requirements.txt"]:
        scp(os.path.join(LOCAL_DIR, f), f"{REMOTE_DIR}/{f}")

    # Install deps
    ssh(f"cd {REMOTE_DIR} && pip3 install -r requirements.txt -q")

    # Create systemd service
    service = f"""[Unit]
Description=BitPredict Telegram Bot
After=network.target

[Service]
Type=simple
WorkingDirectory={REMOTE_DIR}
Environment=BITPREDICT_TG_TOKEN={token}
ExecStart=/usr/bin/python3 {REMOTE_DIR}/bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
    # Write service file via ssh
    ssh(f"cat > /etc/systemd/system/bitpredict-bot.service << 'SERVICEEOF'\n{service}SERVICEEOF")

    # Start bot
    ssh("systemctl daemon-reload")
    ssh("systemctl enable bitpredict-bot")
    ssh("systemctl restart bitpredict-bot")

    # Check status
    import time
    time.sleep(3)
    r = ssh("systemctl is-active bitpredict-bot", check=False)
    if "active" in r.stdout:
        print("\n=== Bot deployed and running! ===")
    else:
        print("\n=== Bot may have issues, checking logs... ===")
        ssh("journalctl -u bitpredict-bot --no-pager -n 20", check=False)

if __name__ == "__main__":
    main()
