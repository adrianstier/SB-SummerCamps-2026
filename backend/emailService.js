import { createClient } from '@supabase/supabase-js';

// Email templates for different notification types
const EMAIL_TEMPLATES = {
  price_drop: {
    subject: (data) => `Price Drop Alert: ${data.camp_name}`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Price Drop Alert!</h1>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            Great news! <strong>${data.camp_name}</strong> has dropped in price.
          </p>
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex: 1;">
                <p style="color: #78716c; font-size: 14px; margin: 0;">Old Price</p>
                <p style="color: #dc2626; font-size: 20px; font-weight: bold; margin: 4px 0; text-decoration: line-through;">$${data.old_price}</p>
              </div>
              <div style="font-size: 24px;">→</div>
              <div style="flex: 1;">
                <p style="color: #78716c; font-size: 14px; margin: 0;">New Price</p>
                <p style="color: #16a34a; font-size: 20px; font-weight: bold; margin: 4px 0;">$${data.new_price}</p>
              </div>
            </div>
            <p style="color: #16a34a; font-size: 14px; margin: 16px 0 0; font-weight: 600;">
              You save $${data.old_price - data.new_price}!
            </p>
          </div>
          <a href="${data.camp_url || '#'}" style="display: inline-block; background: #0891b2; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View Camp Details
          </a>
        </div>
      </div>
    `
  },

  new_session: {
    subject: (data) => `New Session Available: ${data.camp_name}`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Session Added!</h1>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            <strong>${data.camp_name}</strong> has added a new session!
          </p>
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #44403c; font-size: 16px; margin: 0;">
              <strong>Dates:</strong> ${data.session_dates || 'Check website for details'}
            </p>
            ${data.session_details ? `<p style="color: #78716c; font-size: 14px; margin: 12px 0 0;">${data.session_details}</p>` : ''}
          </div>
          <a href="${data.camp_url || '#'}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Book Now
          </a>
        </div>
      </div>
    `
  },

  registration_open: {
    subject: (data) => `Registration Now Open: ${data.camp_name}`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Registration is Open!</h1>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            The camp you've been watching is now accepting registrations!
          </p>
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #44403c; margin: 0 0 8px;">${data.camp_name}</h3>
            <p style="color: #78716c; font-size: 14px; margin: 0;">${data.category || ''} • ${data.ages || ''}</p>
          </div>
          <p style="color: #78716c; font-size: 14px; margin-bottom: 20px;">
            Popular camps fill up quickly - secure your spot today!
          </p>
          <a href="${data.camp_url || '#'}" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Register Now
          </a>
        </div>
      </div>
    `
  },

  spots_available: {
    subject: (data) => `Spots Available: ${data.camp_name}`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Spots Just Opened Up!</h1>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            Good news! <strong>${data.camp_name}</strong> now has spots available.
          </p>
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #44403c; font-size: 16px; margin: 0;">
              ${data.spots_count ? `<strong>${data.spots_count} spots</strong> just became available` : 'Limited spots available'}
            </p>
            ${data.session_dates ? `<p style="color: #78716c; font-size: 14px; margin: 8px 0 0;">${data.session_dates}</p>` : ''}
          </div>
          <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 20px;">
            Don't wait - these spots won't last long!
          </p>
          <a href="${data.camp_url || '#'}" style="display: inline-block; background: #8b5cf6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Reserve Your Spot
          </a>
        </div>
      </div>
    `
  },

  question_answered: {
    subject: (data) => `Your question about ${data.camp_name} was answered`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Your Question Was Answered!</h1>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            Someone answered your question about <strong>${data.camp_name}</strong>.
          </p>
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #78716c; font-size: 12px; text-transform: uppercase; margin: 0;">Your Question</p>
            <p style="color: #44403c; font-size: 14px; margin: 8px 0 16px; font-style: italic;">"${data.question}"</p>
            <p style="color: #78716c; font-size: 12px; text-transform: uppercase; margin: 0;">Answer</p>
            <p style="color: #44403c; font-size: 14px; margin: 8px 0 0;">"${data.answer}"</p>
          </div>
          <a href="${data.camp_url || '#'}" style="display: inline-block; background: #0891b2; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View Full Discussion
          </a>
        </div>
      </div>
    `
  },

  weekly_digest: {
    subject: () => `Your Weekly Summer Camp Digest`,
    html: (data) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Your Weekly Camp Update</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Santa Barbara Summer Camps 2026</p>
        </div>
        <div style="background: #fafaf9; padding: 32px; border: 1px solid #e7e5e4; border-top: 0; border-radius: 0 0 16px 16px;">
          <p style="color: #44403c; font-size: 16px; line-height: 1.6;">
            Hi${data.name ? ` ${data.name}` : ''}! Here's what's new this week:
          </p>

          ${data.scheduled_count > 0 ? `
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #44403c; margin: 0 0 12px; font-size: 16px;">📅 Your Upcoming Camps</h3>
            <p style="color: #78716c; font-size: 14px; margin: 0;">
              You have <strong>${data.scheduled_count}</strong> camp${data.scheduled_count !== 1 ? 's' : ''} scheduled.
            </p>
          </div>
          ` : ''}

          ${data.new_camps?.length > 0 ? `
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #44403c; margin: 0 0 12px; font-size: 16px;">✨ New Camps This Week</h3>
            <ul style="color: #78716c; font-size: 14px; margin: 0; padding-left: 20px;">
              ${data.new_camps.map(camp => `<li style="margin: 8px 0;">${camp.name}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${data.recommendations?.length > 0 ? `
          <div style="background: white; border: 1px solid #d6d3d1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #44403c; margin: 0 0 12px; font-size: 16px;">💡 Recommended for You</h3>
            <ul style="color: #78716c; font-size: 14px; margin: 0; padding-left: 20px;">
              ${data.recommendations.map(camp => `<li style="margin: 8px 0;">${camp.name} - ${camp.category}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <a href="${data.app_url || 'https://sbsummercamps.com'}" style="display: inline-block; background: #0891b2; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Browse All Camps
          </a>

          <p style="color: #a8a29e; font-size: 12px; margin: 24px 0 0; text-align: center;">
            <a href="${data.unsubscribe_url || '#'}" style="color: #a8a29e;">Unsubscribe</a> from weekly digest emails
          </p>
        </div>
      </div>
    `
  }
};

// Email service class
export class EmailService {
  constructor() {
    this.supabase = null;
    this.emailProvider = null;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@sbsummercamps.com';
    this.appUrl = process.env.APP_URL || 'https://sbsummercamps.com';
  }

  // Initialize the email service
  async initialize() {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Initialize email provider (Resend, SendGrid, or SMTP)
    const emailProvider = process.env.EMAIL_PROVIDER || 'console';

    if (emailProvider === 'resend') {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        this.emailProvider = {
          name: 'resend',
          apiKey: resendKey
        };
      }
    } else if (emailProvider === 'sendgrid') {
      const sendgridKey = process.env.SENDGRID_API_KEY;
      if (sendgridKey) {
        this.emailProvider = {
          name: 'sendgrid',
          apiKey: sendgridKey
        };
      }
    } else {
      // Console logging for development
      this.emailProvider = { name: 'console' };
    }

    console.log(`Email service initialized with provider: ${this.emailProvider?.name || 'none'}`);
    return this;
  }

  // Send a single email
  async sendEmail(to, subject, html, text = null) {
    if (!this.emailProvider) {
      console.warn('No email provider configured');
      return { success: false, error: 'No email provider' };
    }

    const emailData = {
      from: this.fromEmail,
      to,
      subject,
      html,
      text: text || this.htmlToText(html)
    };

    try {
      if (this.emailProvider.name === 'resend') {
        return await this.sendViaResend(emailData);
      } else if (this.emailProvider.name === 'sendgrid') {
        return await this.sendViaSendGrid(emailData);
      } else {
        // Console logging for development
        console.log('=== EMAIL (Development Mode) ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML Length: ${html.length} chars`);
        console.log('================================');
        return { success: true, id: `dev-${Date.now()}` };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send via Resend API
  async sendViaResend(emailData) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.emailProvider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Resend API error');
    }

    return { success: true, id: result.id };
  }

  // Send via SendGrid API
  async sendViaSendGrid(emailData) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.emailProvider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: emailData.to }] }],
        from: { email: emailData.from },
        subject: emailData.subject,
        content: [
          { type: 'text/plain', value: emailData.text },
          { type: 'text/html', value: emailData.html }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SendGrid error: ${text}`);
    }

    return { success: true, id: response.headers.get('x-message-id') };
  }

  // Convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Send notification email based on type
  async sendNotificationEmail(userId, notificationType, data) {
    // Get user email from Supabase
    if (!this.supabase) {
      console.warn('Supabase not initialized');
      return { success: false, error: 'Database not connected' };
    }

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('email, full_name, notification_preferences')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Failed to get user profile:', error);
      return { success: false, error: 'User not found' };
    }

    // Check notification preferences
    const prefs = profile.notification_preferences || {};
    if (prefs[notificationType] === false || prefs.email_notifications === false) {
      console.log(`User ${userId} has disabled ${notificationType} notifications`);
      return { success: true, skipped: true };
    }

    // Get template
    const template = EMAIL_TEMPLATES[notificationType];
    if (!template) {
      console.error(`Unknown notification type: ${notificationType}`);
      return { success: false, error: 'Unknown notification type' };
    }

    // Add user data to template data
    const templateData = {
      ...data,
      name: profile.full_name?.split(' ')[0] || '',
      app_url: this.appUrl
    };

    // Generate email
    const subject = template.subject(templateData);
    const html = this.wrapInLayout(template.html(templateData));

    // Send email
    return await this.sendEmail(profile.email, subject, html);
  }

  // Wrap email content in base layout
  wrapInLayout(content) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SB Summer Camps</title>
</head>
<body style="margin: 0; padding: 20px; background: #f5f5f4;">
  ${content}
  <div style="text-align: center; margin-top: 32px; color: #a8a29e; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <p style="margin: 0;">Santa Barbara Summer Camps 2026</p>
    <p style="margin: 8px 0 0;">
      <a href="${this.appUrl}" style="color: #78716c;">Visit Website</a>
    </p>
  </div>
</body>
</html>
    `;
  }

  // Process pending notifications and send emails
  async processNotificationQueue() {
    if (!this.supabase) {
      console.warn('Supabase not initialized');
      return { processed: 0, errors: 0 };
    }

    // Get unprocessed notifications that need email
    const { data: notifications, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('email_sent', false)
      .in('type', ['price_drop', 'new_session', 'registration_open', 'spots_available', 'question_answered'])
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return { processed: 0, errors: 1 };
    }

    let processed = 0;
    let errors = 0;

    for (const notification of notifications || []) {
      const result = await this.sendNotificationEmail(
        notification.user_id,
        notification.type,
        notification.data || {}
      );

      if (result.success) {
        // Mark as sent
        await this.supabase
          .from('notifications')
          .update({ email_sent: true })
          .eq('id', notification.id);
        processed++;
      } else if (!result.skipped) {
        errors++;
      }
    }

    console.log(`Processed ${processed} notifications, ${errors} errors`);
    return { processed, errors };
  }

  // Send weekly digest emails
  async sendWeeklyDigests() {
    if (!this.supabase) {
      console.warn('Supabase not initialized');
      return { sent: 0, errors: 0 };
    }

    // Get users who want weekly digest
    const { data: users, error } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, notification_preferences')
      .filter('notification_preferences->weekly_digest', 'neq', 'false');

    if (error) {
      console.error('Failed to fetch users:', error);
      return { sent: 0, errors: 1 };
    }

    let sent = 0;
    let errors = 0;

    for (const user of users || []) {
      try {
        // Get user's scheduled camps
        const { data: scheduled } = await this.supabase
          .from('scheduled_camps')
          .select('id')
          .eq('user_id', user.id)
          .gte('start_date', new Date().toISOString());

        // Get user activity summary
        const { data: activity } = await this.supabase
          .from('user_activity_summary')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Build digest data
        const digestData = {
          name: user.full_name?.split(' ')[0] || '',
          scheduled_count: scheduled?.length || 0,
          new_camps: [], // Could be populated with newly added camps
          recommendations: [], // Could be populated with AI recommendations
          app_url: this.appUrl,
          unsubscribe_url: `${this.appUrl}/settings/notifications`
        };

        const template = EMAIL_TEMPLATES.weekly_digest;
        const subject = template.subject(digestData);
        const html = this.wrapInLayout(template.html(digestData));

        const result = await this.sendEmail(user.email, subject, html);

        if (result.success) {
          sent++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`Failed to send digest to ${user.email}:`, err);
        errors++;
      }
    }

    console.log(`Sent ${sent} weekly digests, ${errors} errors`);
    return { sent, errors };
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

// CLI runner for testing
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await emailService.initialize();

  switch (command) {
    case 'process':
      await emailService.processNotificationQueue();
      break;
    case 'digest':
      await emailService.sendWeeklyDigests();
      break;
    case 'test':
      // Send a test email
      const testEmail = args[1] || 'test@example.com';
      const result = await emailService.sendEmail(
        testEmail,
        'Test Email from SB Summer Camps',
        `<div style="font-family: sans-serif; padding: 20px;">
          <h1>Test Email</h1>
          <p>This is a test email from the Santa Barbara Summer Camps notification system.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>`
      );
      console.log('Test email result:', result);
      break;
    default:
      console.log('Usage: node emailService.js <command> [args]');
      console.log('Commands:');
      console.log('  process   - Process pending notification queue');
      console.log('  digest    - Send weekly digest emails');
      console.log('  test <email> - Send a test email');
  }
}

// Run if called directly
if (process.argv[1]?.endsWith('emailService.js')) {
  main().catch(console.error);
}
