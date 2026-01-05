import { PrismaClient, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient()

// =====================
// تنظیمات ادمین اولیه
// =====================
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@okayr.ir';
const ADMIN_PASSWORD = 'Admin@123'; // بعداً تغییر بده!
const ADMIN_FIRST_NAME = 'Super';
const ADMIN_LAST_NAME = 'Admin';

async function main() {
    console.log('🔐 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst({
        where: {
            OR: [
                { username: ADMIN_USERNAME },
                { email: ADMIN_EMAIL }
            ]
        }
    });

    if (existingAdmin) {
        console.log('⚠️ Admin already exists:');
        console.log(`   Username: ${existingAdmin.username}`);
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Role: ${existingAdmin.role}`);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin
    const admin = await prisma.admin.create({
        data: {
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            hashedPassword,
            firstName: ADMIN_FIRST_NAME,
            lastName: ADMIN_LAST_NAME,
            role: AdminRole.super_admin,
            isActive: true,
        }
    });

    console.log('✅ Admin created successfully!');
    console.log('');
    console.log('📋 Admin Details:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('⚠️ Remember to change the password after first login!');
}

main()
    .catch((e) => {
        console.error('❌ Error creating admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

