import paramiko
import sys

def deploy():
    host = '37.27.9.38'
    user = 'root'
    password = 'mkn339ndv7Ah'
    target_dir = '/opt/vist'

    print(f"Connecting to {host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, username=user, password=password)
        print("Connected successfully.")

        commands = [
            f"cd {target_dir} && git fetch origin main && git reset --hard origin/main",
            f"cd {target_dir} && ./scripts/start-db.sh",
            # Use both compose files as per deploy.sh logic
            f"cd {target_dir} && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build",
            "sleep 15",
            "docker exec vistos-server npx prisma db push --accept-data-loss",
            "docker exec vistos-server npx prisma db seed"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            for line in stdout:
                print(f"OUT: {line.strip()}")
            for line in stderr:
                print(f"ERR: {line.strip()}")
            
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                print(f"Command failed with status {exit_status}")
        
        print("Deployment sequence finished.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
