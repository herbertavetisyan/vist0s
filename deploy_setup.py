#!/usr/bin/env python3
import paramiko, sys, time

HOST = "37.27.9.38"
PORT = 22
PASSWORD = "mkn339ndv7Ah"
PUB_KEY = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCii7AZhVUvY2WO2xcrbe4a7pPDWOu8CmCygR+WhXfXmBQ//yKj0TxEgaX5Y2gGoGDlQ0CrXyZMx5Yqa93I6s88KydTL4LISa2vX4kKVJ75LhZQ9XhPNGrLTnO0OrlvcSfePFlCjUckvWtxgpiE/JiRlGrisZYyVjuVFD/8csNH3d6jKKYVePTQPRk2/l9K/+JV364dWiDyCehDiiwOrqPAt75ykjBtpt+U9QvPZUbZ4URWEXldvePMg/j8OXa/4A6a3XiOa479TuJK3F3LgIfupF5pr/HiwAbY1Q7/ymGC1TUCcMHzMgqVKyZomMVTI9hGF5gdB1jWQXmZZWaWWqK/wrfnDgNVcrM8Sw6imL35dig3EHxjPUR3B41wGc68QCpEVPHsO9Lj89vEZDeyDO3avB884Sn6gc8YfvUVHICXViEsUnveubEUYITqzq1ADTTjoi12ury68Eh67uYJ+76p8HjdDZbee8G1fAfkPQq3rDbc9B2tr3LG6icC3CWqbak= hebo@asus"

def run(client, cmd, timeout=30):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"[STDERR] {err}", file=sys.stderr)
    return out, err

def try_connect(username):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            HOST, PORT,
            username=username,
            password=PASSWORD,
            timeout=10,
            allow_agent=False,   # disable SSH agent
            look_for_keys=False  # don't try local key files
        )
        print(f"✅ Connected as {username}@{HOST}")
        return client
    except Exception as e:
        print(f"❌ Failed as {username}: {e}")
        return None

# Try common usernames
client = None
for user in ["root", "ubuntu", "hebo", "admin", "deploy"]:
    client = try_connect(user)
    if client:
        break

if not client:
    print("❌ Could not connect with any username")
    sys.exit(1)

# 1. Add SSH public key
run(client, "mkdir -p ~/.ssh && chmod 700 ~/.ssh")
run(client, f"echo '{PUB_KEY}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys")
run(client, "sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys")

# 2. Probe environment
print("\n=== SERVER ENVIRONMENT ===")
run(client, "whoami && hostname && uname -a")
run(client, "df -h / | tail -1")
run(client, "free -h | head -2")
run(client, "docker --version 2>/dev/null || echo 'Docker NOT installed'")
run(client, "docker compose version 2>/dev/null || echo 'Docker Compose NOT installed'")
run(client, "git --version 2>/dev/null || echo 'Git NOT installed'")
run(client, "ls /opt/ 2>/dev/null")
run(client, "docker ps 2>/dev/null | head -20 || echo 'Docker not running or no permission'")
run(client, "ss -tlnp | grep -E '80|443|5000|5432' || netstat -tlnp 2>/dev/null | grep -E '80|443|5000|5432'")

client.close()
print("\n✅ Done. SSH key added successfully!")
