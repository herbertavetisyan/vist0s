#!/usr/bin/env python3
"""
SSL Setup + Redeploy for VistOS
- Generates self-signed cert on the server at /etc/ssl/vistos/
- Uploads updated client/ files (Dockerfile + nginx.conf)
- Syncs updated docker-compose.yml
- Rebuilds and restarts containers
"""
import paramiko, time
from pathlib import Path

HOST, PORT, USER = "37.27.9.38", 22, "root"
LOCAL_DIR = "/home/hebo/vistOs"
REMOTE_DIR = "/opt/vist"

EXCLUDES = {
    "node_modules", ".git", "__pycache__", ".env",
    "dist", ".DS_Store", "deploy.py", "deploy_setup.py",
    "probe.py", "deploy_direct.py", "deploy_ssl.py", "vite.log"
}

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, PORT, username=USER, password="mkn339ndv7Ah",
                   timeout=15, allow_agent=False, look_for_keys=False)
    print(f"✅ Connected as {USER}@{HOST}")
    return client

def run(client, cmd, timeout=300):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    while True:
        if stdout.channel.recv_ready():
            data = stdout.channel.recv(4096).decode("utf-8", errors="replace")
            print(data, end="", flush=True)
        if stdout.channel.exit_status_ready() and not stdout.channel.recv_ready():
            break
        time.sleep(0.1)
    return stdout.channel.recv_exit_status()

def sftp_put(sftp, local, remote):
    try:
        sftp.put(local, remote)
        print(f"  → {remote}")
    except Exception as e:
        print(f"  ⚠️  {e}")

client = connect()

# ── STEP 1: Generate self-signed certificate on server ──────────────────────
print("\n=== Step 1: Generating self-signed SSL certificate ===")
run(client, "mkdir -p /etc/ssl/vistos")
run(client, (
    "openssl req -x509 -nodes -days 3650 -newkey rsa:2048 "
    "-keyout /etc/ssl/vistos/key.pem "
    "-out /etc/ssl/vistos/cert.pem "
    '-subj "/C=US/ST=State/L=City/O=VistOS/CN=37.27.9.38"'
))
run(client, "ls -la /etc/ssl/vistos/")

# ── STEP 2: Upload updated client files ─────────────────────────────────────
print("\n=== Step 2: Uploading updated client files ===")
sftp = client.open_sftp()
sftp_put(sftp, f"{LOCAL_DIR}/client/Dockerfile",  f"{REMOTE_DIR}/client/Dockerfile")
sftp_put(sftp, f"{LOCAL_DIR}/client/nginx.conf",   f"{REMOTE_DIR}/client/nginx.conf")
sftp_put(sftp, f"{LOCAL_DIR}/docker-compose.yml",  f"{REMOTE_DIR}/docker-compose.yml")
sftp.close()
print("✅ Files uploaded.")

# ── STEP 3: Open firewall port 443 ──────────────────────────────────────────
print("\n=== Step 3: Opening firewall port 443 ===")
run(client, "ufw allow 443/tcp 2>/dev/null && echo 'ufw updated' || echo 'ufw not active'")

# ── STEP 4: Rebuild and restart ─────────────────────────────────────────────
print("\n=== Step 4: Rebuilding and restarting containers ===")
run(client, f"cd {REMOTE_DIR} && docker compose down", timeout=60)
exit_code = run(client, f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)

# ── STEP 5: Verify ──────────────────────────────────────────────────────────
print("\n=== Final Status ===")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
run(client, "ss -tlnp | grep -E '80|443'")
run(client, "curl -sk https://localhost --max-time 5 | head -5 || echo 'curl test done'")

if exit_code == 0:
    print(f"\n🎉 SSL Deployment SUCCESSFUL!")
    print(f"   HTTP:  http://37.27.9.38  (redirects to HTTPS)")
    print(f"   HTTPS: https://37.27.9.38")
    print(f"   Note: Browser will show a self-signed cert warning — click Advanced → Proceed")
else:
    print(f"\n❌ Deployment had errors. Check output above.")

client.close()
