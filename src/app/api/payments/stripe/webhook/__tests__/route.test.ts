import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock stripe module
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// Mock gift service
jest.mock("@/server/services/gift.service", () => ({
  updateGiftStatus: jest.fn(),
}));

const MOCK_SECRET = "whsec_test_secret";

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = MOCK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_key";
});

function makeRequest(body: string, sig: string | null) {
  return new NextRequest("http://localhost/api/payments/stripe/webhook", {
    method: "POST",
    body,
    headers: sig ? { "stripe-signature": sig } : {},
  });
}

describe("POST /api/payments/stripe/webhook", () => {
  let stripe: jest.Mocked<{ webhooks: { constructEvent: jest.Mock } }>;

  beforeEach(async () => {
    const Stripe = (await import("stripe")).default as jest.MockedClass<typeof import("stripe").default>;
    stripe = new Stripe("", {} as never) as never;
  });

  it("returns 400 when Stripe-Signature header is missing", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when signature is invalid", async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const res = await POST(makeRequest("{}", "t=123,v1=badsig"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/signature verification failed/i);
  });

  it("returns 200 when signature is valid", async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { metadata: {} } },
    } as never);

    const res = await POST(makeRequest("{}", "t=123,v1=validsig"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.received).toBe(true);
  });
});
