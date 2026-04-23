import axios from "axios";
import { serverConfig } from "@/server/config";

const paystackClient = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${serverConfig.paystack.secretKey}`,
    "Content-Type": "application/json",
  },
});

export interface InitializePaymentParams {
  email: string;
  amountKobo: number; // Paystack uses kobo (1 NGN = 100 kobo)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Initialize a Paystack payment session. */
export async function initializePayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResult> {
  const { data } = await paystackClient.post("/transaction/initialize", {
    email: params.email,
    amount: params.amountKobo,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  });

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/** Verify a Paystack transaction by reference. */
export async function verifyPayment(reference: string): Promise<{
  status: "success" | "failed" | "pending";
  amountKobo: number;
  reference: string;
}> {
  const { data } = await paystackClient.get(`/transaction/verify/${reference}`);
  return {
    status: data.data.status,
    amountKobo: data.data.amount,
    reference: data.data.reference,
  };
}

/** Convert NGN to kobo. */
export const ngnToKobo = (ngn: number) => Math.round(ngn * 100);

/** Refund a Paystack transaction by reference. */
export async function refundPayment(reference: string): Promise<{ status: string }> {
  const { data } = await paystackClient.post("/refund", { transaction: reference });
  return { status: data.data.status };
}
