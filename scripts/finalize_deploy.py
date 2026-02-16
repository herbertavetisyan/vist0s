import paramiko
import time

def finalize():
    host = '37.27.9.38'
    user = 'root'
    password = 'mkn339ndv7Ah'
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, username=user, password=password)
        print("Connected.")

        # Check container status
        print("Checking container status...")
        stdin, stdout, stderr = client.exec_command("docker ps -a --filter name=vistos-server")
        print(stdout.read().decode())

        # If it's restarting, check logs
        print("Checking logs for vistos-server...")
        stdin, stdout, stderr = client.exec_command("docker logs vistos-server --tail 50")
        print(stdout.read().decode())
        print(stderr.read().decode())

        # Wait for it to be ready
        max_retries = 10
        for i in range(max_retries):
            stdin, stdout, stderr = client.exec_command("docker inspect -f '{{.State.Running}}' vistos-server")
            is_running = stdout.read().decode().strip() == 'true'
            if is_running:
                print("Server container is running.")
                break
            print(f"Waiting for server container... ({i+1}/{max_retries})")
            time.sleep(10)
        
        # Finalize Prisma
        print("Running prisma db push...")
        stdin, stdout, stderr = client.exec_command("docker exec vistos-server npx prisma db push --accept-data-loss")
        print(stdout.read().decode())
        print(stderr.read().decode())

        print("Running prisma db seed...")
        stdin, stdout, stderr = client.exec_command("docker exec vistos-server npx prisma db seed")
        print(stdout.read().decode())
        print(stderr.read().decode())

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    finalize()
