
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as schema from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const registerUserSchema = z.object({
  username: z.string().min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد."),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد."),
});

export async function registerUser(input: z.infer<typeof registerUserSchema>) {
  try {
    const { username, password } = registerUserSchema.parse(input);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.username, username),
    });

    if (existingUser) {
      return { success: false, message: 'این نام کاربری قبلا ثبت شده است.' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    await db.insert(schema.users).values({
      username: username,
      hashedPassword: hashedPassword,
      name: username,
      email: `${username}@example.com`,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Registration error:', error);
    return { success: false, message: 'خطای داخلی سرور هنگام ثبت‌نام رخ داد.' };
  }
}
