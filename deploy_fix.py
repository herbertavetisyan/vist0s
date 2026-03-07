#!/usr/bin/env python3
"""Upload api.js + nginx.conf fixes and rebuild client container only."""
import paramiko, time

HOST, PORT, USER = "37.27.9.38", 22, "root"
LOCAL_DIR = "/home/hebo/vistOs"
REMOTE_DIR = "/opt/vist"

def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, PORT, username=USER, password="mkn339ndv7Ah",
              timeout=15, allow_agent=False, look_for_keys=False)
    print(f"✅ Connected as {USER}@{HOST}")
    return c

def run(c, cmd, timeout=300):
    print(f"\n$ {cmd}")
    _, stdout, _ = c.exec_command(cmd, timeout=timeout, get_pty=True)
    while True:
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(4096).decode("utf-8", errors="replace"), end="", flush=True)
        if stdout.channel.exit_status_ready() and not stdout.channel.recv_ready():
            break
        time.sleep(0.1)
    return stdout.channel.recv_exit_status()

c = connect()
sftp = c.open_sftp()

print("\n=== Uploading fixed files ===")

# Create src dirs if needed
try: sftp.mkdir(f"{REMOTE_DIR}/client/src")
except: pass
try: sftp.mkdir(f"{REMOTE_DIR}/client/src/services")
except: pass

sftp.put(f"{LOCAL_DIR}/client/src/services/api.js", f"{REMOTE_DIR}/client/src/services/api.js")
print(f"  → api.js (baseURL: /api)")
sftp.put(f"{LOCAL_DIR}/client/nginx.conf", f"{REMOTE_DIR}/client/nginx.conf")
print(f"  → nginx.conf (added /api proxy)")
sftp.close()

print("\n=== Rebuilding client container only ===")
run(c, f"cd {REMOTE_DIR} && docker compose up -d --build client 2>&1", timeout=300)

print("\n=== Verifying ===")
run(c, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
run(c, "curl -sk https://os.vist.am/api/auth/me --max-time 5 | head -2 || echo 'API reachable'")

print("\n✅ Fix deployed! Try logging in at https://os.vist.am")
c.close()
