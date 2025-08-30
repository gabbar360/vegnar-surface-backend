/**
 * contact service
 */

import { factories } from '@strapi/strapi';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

export default factories.createCoreService('api::contact.contact', ({ strapi }) => ({
  async create(params) {
    console.log('📧 Contact form submitted, starting email process...');
    const result = await super.create(params);
    
    console.log('📋 Result structure:', JSON.stringify(result, null, 2));
    
    // Send email notification (non-blocking)
    const contactData = result.data || result;
    this.sendContactEmail(contactData).catch(error => {
      console.error('❌ Email sending failed:', error);
      strapi.log.error('Email sending failed:', error);
    });
    
    return result;
  },

  async sendContactEmail(contactData) {
    console.log('🔧 Checking email configuration...');
    console.log('📋 Contact data received:', JSON.stringify(contactData, null, 2));
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USERNAME:', process.env.SMTP_USERNAME);
    console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME) {
      console.log('⚠️ Email configuration missing, skipping email send');
      strapi.log.warn('Email configuration missing, skipping email send');
      return;
    }

    console.log('🚀 Creating nodemailer transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const templatePath = path.join(process.cwd(), 'templates', 'contact-email.ejs');
    const emailHtml = await ejs.renderFile(templatePath, contactData);

    const mailOptions = {
      from: process.env.SMTP_USERNAME,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USERNAME,
      subject: `🔔 New Contact: ${contactData.full_name} - ${contactData.company_name || 'Individual'}`,
      html: emailHtml,
    };

    console.log('📨 Sending email to:', mailOptions.to);
    console.log('📋 Email subject:', mailOptions.subject);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      strapi.log.info('Contact email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      console.error('🔍 Full error:', error);
      strapi.log.error('Failed to send contact email:', error);
    }
  },
}));
