// const twilio = require("twilio");

// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// const client = new twilio(accountSid, authToken);

// const sendSMS = async (to, message) => {
//   try {
//     const sms = await client.messages.create({
//       body: message,
//       from: twilioPhoneNumber,
//       to: to,
//     });
//     console.log(`Message sent successfully: ${sms.sid}`);
//     return { success: true, sid: sms.sid };
//   } catch (error) {
//     console.error("Error sending SMS:", error.message);
//     return { success: false, error: error.message };
//   }
// };

// module.exports = sendSMS;
