#!/usr/bin/env python3
"""Probe server for SSL readiness."""
import paramiko

HOST, PORT, USER = "37.27.9.38", 22, "root"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, PORT, username=USER, password="mkn339ndv7Ah",
               timeout=15, allow_agent=False, look_for_keys=False)

def run(cmd):
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"[stderr] {err}")

# Check nginx config inside container
run("docker exec vistos_client cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo 'no nginx conf found'")
run("cat /opt/vist/client/nginx.conf 2>/dev/null || echo 'no local nginx.conf'")
run("cat /opt/vist/.env")
run("ss -tlnp | grep -E '80|443'")
run("which certbot 2>/dev/null || echo 'certbot not installed'")
run("docker exec vistos_client nginx -v 2>&1")
# Check DNS
run("curl -s ifconfig.me 2>/dev/null || echo 'no curl'")

client.close()
