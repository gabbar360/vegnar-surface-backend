// Configure Strapi upload provider to use Cloudinary via environment variables
// Make sure to install the provider: npm install @strapi/provider-upload-cloudinary
export default ({ env }) => ({
  upload: {
    config: {
      provider: '@strapi/provider-upload-cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_CLOUD_NAME'),
        api_key: env('CLOUDINARY_API_KEY'),
        api_secret: env('CLOUDINARY_API_SECRET'),
        secure: env.bool('CLOUDINARY_SECURE', true),
      },
      // Optional: tweak action options if needed
      actionOptions: {
        upload: {},
        delete: {},
      },
    },
  },
});
