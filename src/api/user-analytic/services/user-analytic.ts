/**
 * user-analytic service
 */

import { factories } from '@strapi/strapi';
import axios from 'axios';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import ExcelJS from 'exceljs';

export default factories.createCoreService('api::user-analytic.user-analytic', ({ strapi }) => ({
  async create(params) {
    console.log('📊 User analytics data received');
    
    // Get IP from request
    const ip = this.getClientIP(params.request);
    
    // Get location data from IP
    const locationData = await this.getLocationFromIP(ip);
    
    // Prepare analytics data
    const analyticsData = {
      ...params.data,
      ip_address: ip,
      country: locationData.country,
      country_code: locationData.country_code,
      city: locationData.city,
      session_id: params.data.session_id || this.generateSessionId(),
      user_agent: params.request?.headers['user-agent'] || ''
    };
    
    const result = await super.create({ data: analyticsData });
    
    // Send email notification with complete data
    const emailData = {
      ...analyticsData,
      ...(result.data || result)
    };
    this.sendAnalyticsEmail(emailData).catch(error => {
      console.error('❌ Email failed:', error.message);
    });
    
    return result;
  },

  getClientIP(request) {
    // Try multiple IP detection methods for live servers
    const ip = request?.headers['cf-connecting-ip'] ||  // Cloudflare
               request?.headers['x-forwarded-for']?.split(',')[0]?.trim() || // Proxy
               request?.headers['x-real-ip'] || // Nginx
               request?.headers['x-client-ip'] || // Apache
               request?.headers['x-forwarded'] || 
               request?.headers['forwarded-for'] ||
               request?.headers['forwarded'] ||
               request?.connection?.remoteAddress ||
               request?.socket?.remoteAddress ||
               '127.0.0.1';
    
    console.log('🌐 Detected IP:', ip);
    return ip;
  },

  async getLocationFromIP(ip) {
    try {
      let targetIP = ip;
      
      // If localhost or private IP, get public IP
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        console.log('🌍 Private IP detected, getting public IP...');
        try {
          const publicIPResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
          targetIP = publicIPResponse.data.ip;
          console.log('🌍 Public IP:', targetIP);
        } catch (error) {
          console.log('🌍 Could not get public IP, using original:', ip);
        }
      }
      
      console.log('🌍 Using IP for geolocation:', targetIP);
      
      // Try primary geolocation service
      try {
        const response = await axios.get(`http://ip-api.com/json/${targetIP}`, { timeout: 5000 });
        console.log('🌍 Primary geolocation response:', response.data);
        
        if (response.data.status === 'success') {
          return {
            country: response.data.country,
            country_code: response.data.countryCode,
            city: response.data.city
          };
        }
      } catch (error) {
        console.log('🌍 Primary geolocation failed, trying backup...');
      }
      
      // Try backup geolocation service
      try {
        const backupResponse = await axios.get(`https://ipapi.co/${targetIP}/json/`, { timeout: 5000 });
        console.log('🌍 Backup geolocation response:', backupResponse.data);
        
        if (backupResponse.data.country_name) {
          return {
            country: backupResponse.data.country_name,
            country_code: backupResponse.data.country_code,
            city: backupResponse.data.city
          };
        }
      } catch (error) {
        console.log('🌍 Backup geolocation also failed');
      }
      
    } catch (error) {
      console.error('🌍 All geolocation attempts failed:', error.message);
    }
    
    return {
      country: 'Unknown',
      country_code: 'XX',
      city: 'Unknown'
    };
  },

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  async sendAnalyticsEmail(analyticsData) {
    console.log('📊 Email data:', JSON.stringify(analyticsData, null, 2));
    
    if (!process.env.SMTP_HOST) {
      console.log('⚠️ Email config missing');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: false }
    });

    // Generate Excel with ALL analytics data
    const allData = await strapi.entityService.findMany('api::user-analytic.user-analytic');
    const excelBuffer = await this.generateExcelReport(allData);

    // Generate email HTML
    const templatePath = path.join(process.cwd(), 'templates', 'analytics-email.ejs');
    const emailHtml = await ejs.renderFile(templatePath, analyticsData);

    const mailOptions = {
      from: process.env.SMTP_USERNAME,
      to: process.env.ADMIN_EMAIL,
      subject: `📊 New User Analytics: ${analyticsData.country} - ${analyticsData.consent_type}`,
      html: emailHtml,
      attachments: [{
        filename: `complete-analytics-${new Date().toISOString().split('T')[0]}.xlsx`,
        content: Buffer.from(excelBuffer)
      }]
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Analytics email sent');
    } catch (error) {
      console.error('❌ Email failed:', error.message);
    }
  },

  async generateExcelReport(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User Analytics');

    worksheet.columns = [
      { header: 'Session ID', key: 'session_id', width: 20 },
      { header: 'Consent', key: 'consent_type', width: 15 },
      { header: 'IP Address', key: 'ip_address', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Pages', key: 'total_pages', width: 10 },
      { header: 'Duration', key: 'session_duration', width: 12 },
      { header: 'Created', key: 'createdAt', width: 20 }
    ];

    data.forEach(row => {
      worksheet.addRow({
        session_id: row.session_id,
        consent_type: row.consent_type,
        ip_address: row.ip_address,
        country: row.country,
        city: row.city,
        total_pages: row.total_pages || 1,
        session_duration: row.session_duration || 0,
        createdAt: new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return await workbook.xlsx.writeBuffer();
  },

  async exportAllToExcel() {
    const allData = await strapi.entityService.findMany('api::user-analytic.user-analytic');
    return await this.generateExcelReport(allData);
  }
}));