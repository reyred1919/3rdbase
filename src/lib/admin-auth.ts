import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  adminId: number;
  username: string;
  email: string;
  role: string;
  expiresAt: number;
}

export async function loginAdmin(username: string, password: string) {
  const admin = await db.admin.findFirst({
    where: {
      OR: [
        { username },
        { email: username }
      ],
      isActive: true
    }
  });

  if (!admin) {
    return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
  }

  const isPasswordValid = await bcrypt.compare(password, admin.hashedPassword);
  if (!isPasswordValid) {
    return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
  }

  // Create session
  const session: AdminSession = {
    adminId: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    expiresAt: Date.now() + SESSION_DURATION
  };

  const sessionToken = Buffer.from(JSON.stringify(session)).toString('base64');
  
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  });

  return { success: true, admin };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const session: AdminSession = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (session.expiresAt < Date.now()) {
      await logoutAdmin();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminById(id: number) {
  return db.admin.findUnique({
    where: { id }
  });
}

