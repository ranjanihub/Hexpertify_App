import { config } from '../../config';
import { PaymentGatewayError, PaymentProvider, ProviderName } from './provider';
import { razorpayProvider } from './razorpay.provider';
import { cashfreeProvider } from './cashfree.provider';

const providers: Record<ProviderName, PaymentProvider> = {
  razorpay: razorpayProvider,
  cashfree: cashfreeProvider
};

/** Returns the named provider, or the one selected by PAYMENT_PROVIDER */
export function getPaymentProvider(name?: string): PaymentProvider {
  const key = (name || config.payment.provider) as ProviderName;
  const provider = providers[key];
  if (!provider) {
    throw new PaymentGatewayError(`Unknown payment provider "${key}"`);
  }
  return provider;
}

export function getActivePaymentProvider(): PaymentProvider {
  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    throw new PaymentGatewayError(`Payment provider "${provider.name}" is not configured. Set its API keys in the backend environment.`);
  }
  return provider;
}

export * from './provider';
