import paramiko

def test_deploy():
    host = '37.27.9.38'
    user = 'root'
    passwords = ['H@rbert1991', 'H@rbert1991!', 'H@rbert!1991', 'H@rbert2026', 'H@rbert1111']

    for password in passwords:
        print(f"Testing password: {password}")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(host, username=user, password=password, timeout=5)
            print(f"✅ Success! Password is: {password}")
            
            # Execute one command to be sure
            stdin, stdout, stderr = client.exec_command("echo hello")
            if stdout.read().strip() == b"hello":
                print("Connection verified.")
                client.close()
                return password
        except Exception as e:
            print(f"❌ Failed: {e}")
        finally:
            client.close()
    return None

if __name__ == "__main__":
    test_deploy()
