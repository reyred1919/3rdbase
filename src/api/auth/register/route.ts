
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getUserByUsername } from '@/lib/data/actions';

export async function POST(req: Request) {
  try {
    const { 
        username, 
        password, 
        email,
        firstName,
        lastName,
        mobile,
        invitationCode 
    } = await req.json();

    if (!username || !password || !email || !firstName || !lastName) {
      return NextResponse.json({ message: 'تمام فیلدهای ستاره‌دار الزامی هستند.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUserByUsername = await getUserByUsername(username);
    if (existingUserByUsername) {
      return NextResponse.json({ message: 'این نام کاربری قبلا ثبت شده است.' }, { status: 409 });
    }

    const existingUserByEmail = await db.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
        return NextResponse.json({ message: 'این ایمیل قبلا ثبت شده است.' }, { status: 409 });
    }

    let teamMembershipInfo = {};
    if (invitationCode) {
        const team = await db.team.findFirst({
            where: { invitationLink: invitationCode },
        });

        if (!team) {
            return NextResponse.json({ message: 'کد دعوت نامعتبر است.' }, { status: 400 });
        }
        
        teamMembershipInfo = {
            memberships: {
                create: {
                    teamId: team.id,
                    role: 'member' // All invited users are members by default
                }
            }
        };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    await db.user.create({
      data: {
        username,
        hashedPassword,
        email,
        firstName,
        lastName,
        mobile,
        ...teamMembershipInfo
      }
    });

    return NextResponse.json({ message: 'کاربر با موفقیت ایجاد شد. اکنون می‌توانید وارد شوید.' }, { status: 201 });
  
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'خطای داخلی سرور هنگام ثبت‌نام رخ داد.' }, { status: 500 });
  }
}
