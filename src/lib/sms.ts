import axios from "axios";
import { serverConfig } from "@/server/config";

const termiiClient = axios.create({
  baseURL: "https://api.ng.termii.com/api",
  headers: { "Content-Type": "application/json" },
});

/** Send a new-device login alert with a suspicious-login report link. */
export async function sendNewDeviceAlert(
  phone: string,
  { time, country, reportUrl }: { time: string; country: string; reportUrl: string }
): Promise<void> {
  await termiiClient.post("/sms/send", {
    to: phone,
    from: serverConfig.termii.senderId,
    sms:
      `Lumigift: New login detected on your account.\n` +
      `Time: ${time}\nLocation: ${country}\n` +
      `Not you? Report it: ${reportUrl}`,
    type: "plain",
    channel: "generic",
    api_key: serverConfig.termii.apiKey,
  });
}

/** Send a 6-digit OTP via SMS. */
export async function sendOtp(phone: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await termiiClient.post("/sms/send", {
    to: phone,
    from: serverConfig.termii.senderId,
    sms: `Your Lumigift verification code is: ${otp}. Valid for 10 minutes.`,
    type: "plain",
    channel: "generic",
    api_key: serverConfig.termii.apiKey,
  });

  return otp;
}
