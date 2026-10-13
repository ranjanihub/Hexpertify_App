/**
 * Opens the payment gateway checkout returned by the Backend `/api/payments/order` endpoint.
 * Supports Razorpay (checkout.js popup) and Cashfree (JS SDK v3 modal).
 *
 * Keep in sync with Client_Panel/.../client-dashboard/src/lib/payment-checkout.ts
 */

export type CheckoutParams =
  | {
      provider: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      description?: string;
      prefill?: { name?: string; email?: string; contact?: string };
    }
  | {
      provider: "cashfree";
      paymentSessionId: string;
      orderId: string;
      mode: "sandbox" | "production";
    };

export type CheckoutResult =
  | { status: "completed"; response: Record<string, any> }
  | { status: "dismissed" }
  | { status: "failed"; error: string };

const SCRIPTS = {
  razorpay: "https://checkout.razorpay.com/v1/checkout.js",
  cashfree: "https://sdk.cashfree.com/js/v3/cashfree.js",
};

const loaded: Record<string, Promise<void>> = {};

function loadScript(src: string): Promise<void> {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        delete loaded[src];
        reject(new Error("Could not load the payment gateway. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return loaded[src];
}

export async function openPaymentCheckout(
  checkout: CheckoutParams,
  options: { businessName?: string; themeColor?: string } = {},
): Promise<CheckoutResult> {
  if (checkout.provider === "razorpay") {
    await loadScript(SCRIPTS.razorpay);
    return new Promise<CheckoutResult>((resolve) => {
      const Razorpay = (window as any).Razorpay;
      const rzp = new Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: options.businessName || "Hexpertify",
        description: checkout.description,
        prefill: checkout.prefill,
        theme: { color: options.themeColor || "#450BC8" },
        handler: (response: Record<string, any>) => resolve({ status: "completed", response }),
        modal: { ondismiss: () => resolve({ status: "dismissed" }) },
      });
      // Razorpay lets the customer retry inside the popup, so a failed attempt does not resolve here
      rzp.open();
    });
  }

  if (checkout.provider === "cashfree") {
    await loadScript(SCRIPTS.cashfree);
    const cashfree = (window as any).Cashfree({ mode: checkout.mode });
    const result = await cashfree.checkout({
      paymentSessionId: checkout.paymentSessionId,
      redirectTarget: "_modal",
    });
    if (result?.error) {
      const message = String(result.error.message || "");
      return /closed|cancel/i.test(message) ? { status: "dismissed" } : { status: "failed", error: message || "Payment failed" };
    }
    // Cashfree confirms on the server side; the order id is enough for verification
    return { status: "completed", response: { orderId: checkout.orderId } };
  }

  return { status: "failed", error: "Unsupported payment provider" };
}
