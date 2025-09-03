/**
 * become-a-partener controller
 */

import { factories } from '@strapi/strapi'
import nodemailer from 'nodemailer';

export default factories.createCoreController('api::become-a-partener.become-a-partener', ({ strapi }) => ({
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      
      // Create entry in database
      const entity = await strapi.entityService.create('api::become-a-partener.become-a-partener', {
        data: {
          ...data,
          publishedAt: new Date(),
        },
      });

      // Send email notification
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_USERNAME,
        to: process.env.ADMIN_EMAIL,
        subject: 'New Partnership Application - Vegnar Surfaces',
        html: `
          <h2>New Partnership Application Received</h2>
          <p><strong>Name:</strong> ${data.full_name}</p>
          <p><strong>Company:</strong> ${data.company_name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Country:</strong> ${data.country}</p>
          <p><strong>Business Type:</strong> ${data.business_type}</p>
          <p><strong>Experience:</strong> ${data.business_experience}</p>
          <p><strong>Interests:</strong> ${data.partnership_interests}</p>
        `
      };

      await transporter.sendMail(mailOptions);

      return { data: entity };
    } catch (error) {
      console.error('Error:', error);
      ctx.throw(500, error);
    }
  },
}));
