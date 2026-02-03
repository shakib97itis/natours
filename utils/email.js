const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter.
  // For production, replace with your actual SMTP server details.
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    //   secure: false, // Use true for port 465, false for port 587
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Define the email options
  const MailOptions = {
    from: '"Shakibul Islam" <binarymonk06@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message, // Plain-text version of the message
    // html: '<b>Hello world?</b>', // HTML version of the message
  };

  // Send the email
  await transporter.sendMail(MailOptions);
};

module.exports = sendEmail;
