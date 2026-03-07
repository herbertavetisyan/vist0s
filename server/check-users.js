import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.length);
  if (users.length > 0) {
    console.log(users.map(u => u.email));
  } else {
    console.log("No users found. Creating a test admin user.");
    
    // Need a tenant and role first
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        tenant = await prisma.tenant.create({ data: { name: 'Test Tenant' } });
    }
    
    let role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'Admin' } });
    if (!role) {
        role = await prisma.role.create({
            data: {
                tenantId: tenant.id,
                name: 'Admin',
                permissions: {}
            }
        });
    }

    // Hash password 'password123'
    import('bcryptjs').then(async (bcrypt) => {
        const hash = await bcrypt.hash('password123', 10);
        await prisma.user.create({
            data: {
                tenantId: tenant.id,
                roleId: role.id,
                email: 'admin@vistos.com',
                passwordHash: hash,
                firstName: 'Admin',
                lastName: 'User'
            }
        });
        console.log("Test user created: admin@vistos.com / password123");
        process.exit(0);
    });
  }
}

check();
