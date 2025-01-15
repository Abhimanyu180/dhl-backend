class NotificationService {
    static async sendSMS(phone, message) {
      try {
        // Implement SMS sending logic using Twilio, Nexmo, or any other SMS service
        console.log(`Sending SMS to ${phone}: ${message}`);
        // Example: await smsProvider.send(phone, message);
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}: ${error.message}`);
      }
    }
  }
  
  module.exports = NotificationService;
  