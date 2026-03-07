#!/usr/bin/env python3
"""
VistOS Direct Deploy Script
Syncs local code to /opt/vist on the server via SFTP and rebuilds containers.
"""
import paramiko, sys, time, os, stat
from pathlib import Path

HOST, PORT, USER = "37.27.9.38", 22, "root"
LOCAL_DIR = "/home/hebo/vistOs"
REMOTE_DIR = "/opt/vist"

# Files/dirs to exclude from sync
EXCLUDES = {
    "node_modules", ".git", "__pycache__", ".env",
    "dist", ".DS_Store", "deploy.py", "deploy_setup.py",
    "probe.py", "deploy_direct.py"
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
    output = []
    while True:
        if stdout.channel.recv_ready():
            data = stdout.channel.recv(4096).decode("utf-8", errors="replace")
            print(data, end="", flush=True)
            output.append(data)
        if stdout.channel.exit_status_ready() and not stdout.channel.recv_ready():
            break
        time.sleep(0.1)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code, "".join(output)

def sftp_upload_dir(sftp, local_path, remote_path):
    """Recursively upload a directory via SFTP."""
    local = Path(local_path)
    
    # Create remote dir
    try:
        sftp.mkdir(remote_path)
    except IOError:
        pass  # Already exists
    
    for item in local.iterdir():
        if item.name in EXCLUDES:
            continue
        
        remote_item = f"{remote_path}/{item.name}"
        
        if item.is_dir():
            sftp_upload_dir(sftp, str(item), remote_item)
        else:
            try:
                sftp.put(str(item), remote_item)
                print(f"  → {remote_item}", flush=True)
            except Exception as e:
                print(f"  ⚠️  Failed to upload {item}: {e}")

# Connect
client = connect()

print("\n=== Step 1: Backing up server .env file ===")
run(client, f"cp /opt/vist/server/.env /tmp/server.env.bak 2>/dev/null && echo 'backed up' || echo 'no server .env to backup'")
run(client, f"cp /opt/vist/.env /tmp/root.env.bak 2>/dev/null && echo 'backed up' || echo 'no root .env to backup'")

print("\n=== Step 2: Uploading code via SFTP ===")
sftp = client.open_sftp()

# Upload server directory
print("\nUploading server/...")
sftp_upload_dir(sftp, f"{LOCAL_DIR}/server", f"{REMOTE_DIR}/server")

# Upload client directory
print("\nUploading client/...")
sftp_upload_dir(sftp, f"{LOCAL_DIR}/client", f"{REMOTE_DIR}/client")

# Upload docker-compose.yml
print("\nUploading docker-compose.yml...")
sftp.put(f"{LOCAL_DIR}/docker-compose.yml", f"{REMOTE_DIR}/docker-compose.yml")

sftp.close()
print("\n✅ Upload complete!")

print("\n=== Step 3: Restoring .env files ===")
run(client, f"cp /tmp/server.env.bak /opt/vist/server/.env 2>/dev/null && echo 'restored server .env' || echo 'no backup to restore'")
run(client, f"cp /tmp/root.env.bak /opt/vist/.env 2>/dev/null && echo 'restored root .env' || echo 'no backup to restore'")

print("\n=== Step 4: Stopping old containers ===")
run(client, f"cd {REMOTE_DIR} && docker compose down", timeout=60)

print("\n=== Step 5: Building and starting containers ===")
exit_code, _ = run(client, f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)

print("\n=== Final Status ===")
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

if exit_code == 0:
    print(f"\n🎉 Deployment SUCCESSFUL! App is live at http://{HOST}")
else:
    print(f"\n❌ Deployment had errors (exit code {exit_code}). Check output above.")

client.close()
