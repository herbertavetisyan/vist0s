#!/usr/bin/env python3
"""
VistOS Deployment Script
Syncs code to /opt/vist on 37.27.9.38 and restarts Docker containers.
"""
import paramiko, sys, time

HOST = "37.27.9.38"
PORT = 22
USER = "root"
PRIVATE_KEY = "/home/hebo/.ssh/id_rsa"
REMOTE_DIR = "/opt/vist"

def run(client, cmd, timeout=120):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    # Stream output in real time
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            data = stdout.channel.recv(1024).decode("utf-8", errors="replace")
            print(data, end="", flush=True)
        time.sleep(0.1)
    # Drain remaining output
    remaining = stdout.channel.recv(65536).decode("utf-8", errors="replace")
    if remaining:
        print(remaining, end="", flush=True)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # Try key-based auth first
        client.connect(HOST, PORT, username=USER, key_filename=PRIVATE_KEY,
                       timeout=15, allow_agent=False, look_for_keys=False)
        print(f"✅ Connected via SSH key as {USER}@{HOST}")
    except Exception as e:
        print(f"Key auth failed ({e}), trying password...")
        client.connect(HOST, PORT, username=USER, password="mkn339ndv7Ah",
                       timeout=15, allow_agent=False, look_for_keys=False)
        print(f"✅ Connected via password as {USER}@{HOST}")
    return client

client = connect()

print("\n=== Checking current server state ===")
run(client, f"ls {REMOTE_DIR}")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

print(f"\n=== Checking git remote in {REMOTE_DIR} ===")
run(client, f"cd {REMOTE_DIR} && git remote -v 2>/dev/null || echo 'No git repo'")
run(client, f"cd {REMOTE_DIR} && git log --oneline -3 2>/dev/null || echo 'No git history'")

print("\n=== Pulling latest code ===")
exit_code = run(client, f"cd {REMOTE_DIR} && git fetch origin && git reset --hard origin/main 2>&1")
if exit_code != 0:
    print("⚠️  Git pull failed — trying git pull directly")
    run(client, f"cd {REMOTE_DIR} && git pull origin main 2>&1")

print("\n=== Rebuilding and restarting containers ===")
run(client, f"cd {REMOTE_DIR} && docker compose down", timeout=60)
run(client, f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)

print("\n=== Final container status ===")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

print(f"\n✅ Deployment complete! App is live at http://{HOST}")
client.close()
