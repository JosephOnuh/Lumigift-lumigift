import axios from "axios";
import { serverConfig } from "@/server/config";

const termiiClient = axios.create({
  baseURL: "https://api.ng.termii.com/api",
  headers: { "Content-Type": "application/json" },
});

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
