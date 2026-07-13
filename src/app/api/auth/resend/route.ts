import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { sendEmail, getVerificationEmailTemplate } from '../../../../lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account not found.' },
        { status: 404 }
      );
    }

    if (user.is_verified) {
      return NextResponse.json(
        { error: 'Email address is already verified.' },
        { status: 400 }
      );
    }

    // Generate new OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verification_code: verificationCode,
        verification_code_expires: verificationExpires,
      },
    });

    // Send email
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'Your new Premium Hub verification code',
      html: getVerificationEmailTemplate(user.name, verificationCode),
    });

    if (!emailSent) {
      console.warn(`Could not dispatch verification email to ${user.email}`);
    }

    return NextResponse.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
    });
  } catch (error: unknown) {
    console.error('Resend verification code API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
