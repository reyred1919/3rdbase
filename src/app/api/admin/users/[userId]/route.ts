import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import { sendAccountActivatedEmail, sendAccountDeactivatedEmail } from '@/lib/email';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();

    // Get current user state before update
    const currentUser = await db.user.findUnique({
      where: { id: parseInt(userId) },
      select: { is_active: true, email: true, firstName: true },
    });

    const user = await db.user.update({
      where: { id: parseInt(userId) },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.mobile !== undefined && { mobile: body.mobile }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });

    // Send email if activation status changed
    if (body.is_active !== undefined && currentUser && currentUser.is_active !== body.is_active) {
      const email = user.email || currentUser.email;
      const firstName = user.firstName || currentUser.firstName || 'کاربر';
      
      if (email) {
        if (body.is_active) {
          // User was activated
          sendAccountActivatedEmail(email, firstName).catch((err) => {
            console.error('Failed to send activation email:', err);
          });
        } else {
          // User was deactivated
          sendAccountDeactivatedEmail(email, firstName).catch((err) => {
            console.error('Failed to send deactivation email:', err);
          });
        }
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admin can delete users
    if (session.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    await db.user.delete({
      where: { id: parseInt(userId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

