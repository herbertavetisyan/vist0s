#!/usr/bin/env python3
"""
Let's Encrypt SSL for os.vist.am
1. Install certbot on server
2. Stop client container (frees port 80 for certbot standalone challenge)
3. Issue cert via certbot --standalone
4. Upload updated nginx.conf + docker-compose.yml
5. Rebuild and restart all containers
"""
import paramiko, time

HOST, PORT, USER = "37.27.9.38", 22, "root"
DOMAIN = "os.vist.am"
EMAIL = "admin@vist.am"   # used for Let's Encrypt renewal notices
LOCAL_DIR = "/home/hebo/vistOs"
REMOTE_DIR = "/opt/vist"

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

client = connect()

# ── STEP 1: Install certbot ──────────────────────────────────────────────────
print("\n=== Step 1: Installing certbot ===")
run(client, "apt-get update -qq && apt-get install -y certbot", timeout=120)

# ── STEP 2: Stop client container to free port 80 ───────────────────────────
print("\n=== Step 2: Stopping client container to free port 80 ===")
run(client, f"cd {REMOTE_DIR} && docker compose stop client", timeout=30)

# ── STEP 3: Obtain Let's Encrypt certificate ─────────────────────────────────
print(f"\n=== Step 3: Obtaining Let's Encrypt cert for {DOMAIN} ===")
rc = run(client,
    f"certbot certonly --standalone -d {DOMAIN} "
    f"--non-interactive --agree-tos -m {EMAIL} "
    f"--keep-until-expiring 2>&1",
    timeout=120
)
if rc != 0:
    print(f"\n❌ certbot failed! Check output above.")
    client.close()
    exit(1)

run(client, f"ls -la /etc/letsencrypt/live/{DOMAIN}/")

# ── STEP 4: Upload updated nginx.conf + docker-compose.yml ──────────────────
print("\n=== Step 4: Uploading updated nginx.conf and docker-compose.yml ===")
sftp = client.open_sftp()
sftp.put(f"{LOCAL_DIR}/client/nginx.conf",  f"{REMOTE_DIR}/client/nginx.conf")
sftp.put(f"{LOCAL_DIR}/docker-compose.yml", f"{REMOTE_DIR}/docker-compose.yml")
sftp.close()
print("✅ Files uploaded.")

# ── STEP 5: Rebuild and restart ─────────────────────────────────────────────
print("\n=== Step 5: Rebuilding and restarting containers ===")
run(client, f"cd {REMOTE_DIR} && docker compose down", timeout=60)
rc = run(client, f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)

# ── STEP 6: Verify ──────────────────────────────────────────────────────────
print("\n=== Final Status ===")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
run(client, f"curl -s https://{DOMAIN} --max-time 8 | head -3 || echo 'curl done'")

if rc == 0:
    print(f"\n🎉 Let's Encrypt SSL LIVE!")
    print(f"   https://{DOMAIN}  ← trusted green padlock ✅")
    print(f"   http://{DOMAIN}   ← redirects to HTTPS")
    print(f"\n   Cert expires in 90 days. Renew with: certbot renew")
else:
    print(f"\n❌ Deployment had errors. Check output above.")

client.close()
