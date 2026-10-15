import type {
  IMessagingProvider,
  BookingInput,
  MessageKind,
  MessageLanguage,
  SendMessageResult,
} from './types';
import { WaMeMessagingProvider } from './wa-me';
import { WhatsAppCloudApiProvider } from './cloud-api';

/**
 * Singleton instance of active messaging provider.
 */
let messagingProviderInstance: IMessagingProvider | null = null;

/**
 * Factory to retrieve current messaging provider.
 * Implementation 1 (default): WaMeMessagingProvider (wa.me click-to-chat links)
 * Implementation 2 (optional, behind env flag): WhatsAppCloudApiProvider (Meta WhatsApp Cloud API)
 */
export function getMessagingProvider(): IMessagingProvider {
  if (!messagingProviderInstance) {
    const isCloudApiEnabled =
      process.env.WHATSAPP_PROVIDER === 'cloud_api' ||
      process.env.ENABLE_WHATSAPP_CLOUD_API === 'true';

    if (isCloudApiEnabled) {
      messagingProviderInstance = new WhatsAppCloudApiProvider();
    } else {
      messagingProviderInstance = new WaMeMessagingProvider();
    }
  }
  return messagingProviderInstance;
}

/**
 * Reset provider singleton (useful for testing or switching env dynamically)
 */
export function setMessagingProvider(provider: IMessagingProvider | null): void {
  messagingProviderInstance = provider;
}

/**
 * ============================================================================
 * UNIFIED MESSAGING INTERFACE: sendMessage(kind, booking, lang)
 * ============================================================================
 *
 * Dispatches WhatsApp message for:
 * 1. guest_confirmed: confirmation with token, time, seat count & location
 * 2. guest_rejected: polite rejection with next available slot suggested
 * 3. guest_reminder: friendly reminder of reservation
 * 4. owner_new_booking: instant booking alert to restaurant owner
 *
 * Both Implementation 1 (wa.me link demo) and Implementation 2 (WhatsApp Cloud API)
 * implement this exact signature so the rest of the application code remains unchanged.
 */
export async function sendMessage(
  kind: MessageKind,
  booking: BookingInput,
  lang: MessageLanguage = 'en'
): Promise<SendMessageResult> {
  const provider = getMessagingProvider();
  return provider.sendMessage(kind, booking, lang);
}

// Re-export all sub-modules
export * from './types';
export * from './templates';
export * from './logger';
export * from './wa-me';
export * from './cloud-api';
