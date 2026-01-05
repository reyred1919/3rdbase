
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getUserByUsername } from '@/lib/data/actions';
import { sendWelcomeEmail, sendAdminNotificationEmail } from '@/lib/email';

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

    let teamData = {};
    let teamToJoin = null;

    if (invitationCode) {
        const invitation = await db.teamInvitation.findUnique({
            where: { code: invitationCode },
            include: { team: true }
        });

        if (!invitation) {
            return NextResponse.json({ message: 'کد دعوت نامعتبر است.' }, { status: 400 });
        }
        teamToJoin = invitation.team;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user and potentially connect to a team
    await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                username,
                hashedPassword,
                email,
                firstName,
                lastName,
                mobile,
            }
        });

        if (teamToJoin) {
          // Create membership link
          await tx.teamMembership.create({
            data: {
              user: { connect: { id: newUser.id } },
              team: { connect: { id: teamToJoin.id } },
              role: 'member' // All invited users are members by default
            }
          });
          // Create a member record
          await tx.member.create({
            data: {
              team: { connect: { id: teamToJoin.id } },
              user: { connect: { id: newUser.id } },
              name: `${firstName} ${lastName}`,
              avatarUrl: `https://placehold.co/40x40.png?text=${firstName.charAt(0)}`
            }
          });
        }
    });

    // Send emails (non-blocking)
    // 1. Send welcome email to user
    sendWelcomeEmail(email, firstName).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // 2. Send notification email to admin
    sendAdminNotificationEmail({
      firstName,
      lastName,
      email,
      username,
      mobile,
    }).catch((err) => {
      console.error('Failed to send admin notification email:', err);
    });

    return NextResponse.json({ message: 'کاربر با موفقیت ایجاد شد. بعد از بررسی اطلاعات شما، نتیجه فعال‌سازی از طریق ایمیل برای شما ارسال می‌شود.' }, { status: 201 });
  
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'خطای داخلی سرور هنگام ثبت‌نام رخ داد.' }, { status: 500 });
  }
}
