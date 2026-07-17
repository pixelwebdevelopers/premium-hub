import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Load environment variables for SMTP
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || '"Premium Hub" <noreply@premiumhub.com>';

// Create transporter if SMTP configuration is present
let transporter: nodemailer.Transporter | null = null;
if (SMTP_HOST) {
  const mailConfig: any = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for port 465, false for other ports
  };
  
  if (SMTP_USER && SMTP_PASS) {
    mailConfig.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }
  
  transporter = nodemailer.createTransport(mailConfig);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    html,
    text: text || subject, // fallback text version
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📨 [SMTP EMAIL SENT] Subject: "${subject}" to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ [SMTP EMAIL ERROR] Failed to send email via SMTP:', error);
      // Fallback to writing preview file on error
    }
  }

  // Fallback / Development mode: Write HTML preview file
  try {
    const previewDir = path.join(process.cwd(), 'public', 'email-previews');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTo = to.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${timestamp}_${sanitizedTo}.html`;
    const filePath = path.join(previewDir, fileName);

    // Style the preview container a bit so it looks nice in development
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Dev Email Preview: ${subject}</title>
          <style>
            .preview-header {
              background: #0f172a;
              color: #f8fafc;
              padding: 16px;
              font-family: sans-serif;
              border-bottom: 3px solid #8b5cf6;
              margin-bottom: 20px;
            }
            .preview-meta {
              font-size: 13px;
              color: #94a3b8;
              margin-top: 4px;
            }
            .preview-body {
              padding: 20px;
              background: #fafafa;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              max-width: 600px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="preview-header">
            <h2 style="margin: 0; color: #8b5cf6;">Premium Hub Email Sandbox</h2>
            <div class="preview-meta"><strong>TO:</strong> ${to}</div>
            <div class="preview-meta"><strong>SUBJECT:</strong> ${subject}</div>
            <div class="preview-meta"><strong>SENT:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <div class="preview-body">
            ${html}
          </div>
        </body>
      </html>
    `;

    fs.writeFileSync(filePath, styledHtml, 'utf8');

    // Terminal color tags are not supported, so use simple text styling
    console.log('\n================================================================');
    console.log(`📬 [EMAIL PREVIEW GENERATED]`);
    console.log(`👉 Subject: "${subject}"`);
    console.log(`👉 Recipient: ${to}`);
    console.log(`👉 Local File Path: ${filePath}`);
    console.log(`👉 View Preview: http://localhost:3000/email-previews/${fileName}`);
    console.log('================================================================\n');

    return true;
  } catch (error) {
    console.error('❌ [DEV EMAIL PREVIEW ERROR] Failed to write preview file:', error);
    return false;
  }
}

// Helper to get HTML templates for verification and order
export function getVerificationEmailTemplate(name: string, code: string): string {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a855f7; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Premium Hub</h1>
        <p style="color: #71717a; margin: 4px 0 0 0; font-size: 14px;">Your Premium Services Provider</p>
      </div>
      
      <div style="background: rgba(255,255,255,0.02); padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
        <h3 style="margin-top: 0; color: #ffffff; font-size: 18px;">Verify Your Email Address</h3>
        <p style="color: #a1a1aa; line-height: 1.6; font-size: 14px;">
          Hello <strong>${name}</strong>,<br/><br/>
          Thank you for creating an account with Premium Hub. Use the verification code below to verify your email address and activate your account.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; background: #8b5cf6; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); font-family: monospace;">${code}</span>
        </div>
        
        <p style="color: #71717a; font-size: 13px; text-align: center; margin-bottom: 0;">
          This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; border-top: 1px solid #27272a; padding-top: 20px;">
        <p style="color: #52525b; font-size: 12px; margin: 0;">
          &copy; 2026 Premium Hub. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

export function getOrderEmailTemplate(
  customerName: string,
  trackingId: string,
  subscriptionName: string,
  price: string,
  currency: string,
  status: string,
  instructions: string = ''
): string {
  const statusColors: Record<string, string> = {
    unpaid: '#f59e0b',
    paid: '#3b82f6',
    completed: '#10b981',
  };

  const statusLabel: Record<string, string> = {
    unpaid: 'Unpaid / Pending Receipt Review',
    paid: 'Paid / Fulfilment In Progress',
    completed: 'Active / Completed',
  };

  const color = statusColors[status.toLowerCase()] || '#8b5cf6';
  const label = statusLabel[status.toLowerCase()] || status;

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #09090b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a855f7; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Premium Hub</h1>
        <p style="color: #71717a; margin: 4px 0 0 0; font-size: 14px;">Order Placement Receipt</p>
      </div>
      
      <div style="background: rgba(255,255,255,0.02); padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #ffffff; font-size: 18px;">Order Placed Successfully!</h3>
        <p style="color: #a1a1aa; line-height: 1.6; font-size: 14px;">
          Hello <strong>${customerName}</strong>,<br/><br/>
          Your order has been recorded. Below are your order details and tracking instructions.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #e4e4e7; font-size: 14px;">
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 10px 0; color: #71717a; font-weight: 600;">Tracking ID</td>
            <td style="padding: 10px 0; font-weight: 700; color: #a855f7; font-family: monospace;">${trackingId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 10px 0; color: #71717a; font-weight: 600;">Subscription</td>
            <td style="padding: 10px 0; font-weight: 600;">${subscriptionName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 10px 0; color: #71717a; font-weight: 600;">Billing Price</td>
            <td style="padding: 10px 0; font-weight: bold; color: #ffffff;">${price} ${currency}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #71717a; font-weight: 600;">Order Status</td>
            <td style="padding: 10px 0;">
              <span style="display: inline-block; background: ${color}20; color: ${color}; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid ${color}40;">
                ${label}
              </span>
            </td>
          </tr>
        </table>
      </div>

      ${instructions ? `
      <div style="background: rgba(245, 158, 11, 0.05); padding: 18px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.15); margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 14px;">Payment Instructions</h4>
        <div style="color: #d4d4d8; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap;">${instructions}</div>
      </div>
      ` : ''}

      <div style="background: rgba(255,255,255,0.01); padding: 16px; border-radius: 8px; border: 1px solid #27272a; text-align: center;">
        <p style="color: #a1a1aa; font-size: 13px; margin: 0;">
          You can track this order in your customer dashboard or on the landing page using your Tracking ID: <strong>${trackingId}</strong>.
        </p>
      </div>

      <div style="text-align: center; margin-top: 30px; border-top: 1px solid #27272a; padding-top: 20px;">
        <p style="color: #52525b; font-size: 12px; margin: 0;">
          &copy; 2026 Premium Hub. All rights reserved.
        </p>
      </div>
    </div>
  `;
}
