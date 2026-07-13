import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { hashPassword } from '../../../../lib/auth';
import { sendEmail, getVerificationEmailTemplate } from '../../../../lib/email';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const passwordHash = await hashPassword(password);

    if (existingUser) {
      if (existingUser.is_verified) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 400 }
        );
      }

      // User exists but not verified - update password and new verification code
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password_hash: passwordHash,
          verification_code: verificationCode,
          verification_code_expires: verificationExpires,
        },
      });
    } else {
      // Create new customer account
      await prisma.user.create({
        data: {
          name,
          email: emailLower,
          password_hash: passwordHash,
          role: 'customer',
          is_verified: false,
          verification_code: verificationCode,
          verification_code_expires: verificationExpires,
          can_view_subscriptions: false,
          can_view_analytics: false,
          can_view_settings: false,
        },
      });
    }

    // Send verification email
    const emailSent = await sendEmail({
      to: emailLower,
      subject: 'Verify your Premium Hub account',
      html: getVerificationEmailTemplate(name, verificationCode),
    });

    if (!emailSent) {
      console.warn(`Could not dispatch verification email to ${emailLower}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to email.',
      email: emailLower,
    });
  } catch (error: unknown) {
    console.error('Registration API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
