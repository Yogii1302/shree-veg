import type {
  IMessagingProvider,
  BookingInput,
  SendMessageResult,
  MessageKind,
  MessageLanguage,
  BookingMessagePayload,
  Locale,
} from './types';
import {
  normalizeBookingInput,
  renderMessageTemplate,
  getCloudApiTemplatePayload,
  TEMPLATES,
} from './templates';
import { logMessage } from './logger';

export interface WhatsAppCloudApiConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion?: string;
}

/**
 * Implementation 2 (Optional, behind env flag WHATSAPP_PROVIDER='cloud_api'):
 * WhatsApp Business Cloud API adapter using Meta's Test Number or Production WABA.
 * Dispatches template messages and registers message_log entries with Meta's wamid.
 */
export class WhatsAppCloudApiProvider implements IMessagingProvider {
  private config: WhatsAppCloudApiConfig;

  constructor(customConfig?: Partial<WhatsAppCloudApiConfig>) {
    this.config = {
      accessToken:
        customConfig?.accessToken ||
        process.env.WHATSAPP_CLOUD_API_TOKEN ||
        process.env.META_ACCESS_TOKEN ||
        '',
      phoneNumberId:
        customConfig?.phoneNumberId ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        '',
      businessAccountId:
        customConfig?.businessAccountId ||
        process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
        '',
      apiVersion: customConfig?.apiVersion || process.env.META_API_VERSION || 'v21.0',
    };
  }

  /**
   * Primary single interface: sendMessage(kind, booking, lang)
   */
  async sendMessage(
    kind: MessageKind,
    bookingInput: BookingInput,
    lang: MessageLanguage = 'en'
  ): Promise<SendMessageResult> {
    const normalized = normalizeBookingInput(bookingInput);
    const messageText = renderMessageTemplate(kind, normalized, lang);
    const textMr = TEMPLATES[kind].mr(normalized);
    const textEn = TEMPLATES[kind].en(normalized);

    const recipientPhone =
      kind === 'owner_new_booking'
        ? normalized.cleanRestaurantPhone
        : normalized.cleanGuestPhone;

    // Direct wa.me fallback link in case Cloud API fails or credentials are dummy
    const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(messageText)}`;

    // Verify whether required credentials are set
    if (!this.config.accessToken || !this.config.phoneNumberId) {
      console.warn(
        '[WhatsAppCloudApi] Missing WHATSAPP_CLOUD_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID. Falling back to wa.me link.'
      );

      const fallbackId = `cloud-fallback-${Date.now()}`;
      await logMessage({
        restaurantId: normalized.id ? undefined : 'shree-theur-main',
        bookingId: normalized.id.startsWith('temp-') ? null : normalized.id,
        recipientPhone,
        messageType: kind,
        provider: 'cloud_api',
        status: 'draft',
        messageId: fallbackId,
        payload: {
          note: 'Cloud API credentials not configured in env, generated wa.me fallback URL',
          waUrl,
          textPreview: messageText.substring(0, 160),
        },
      });

      return {
        success: true,
        provider: 'cloud_api',
        kind,
        recipientPhone,
        text: messageText,
        url: waUrl,
        messageId: fallbackId,
        status: 'draft',
        error: 'Cloud API credentials missing. wa.me link provided.',
        timestamp: new Date().toISOString(),
        customerActionUrl: waUrl,
        formattedMessageMarathi: textMr,
        formattedMessageEnglish: textEn,
      };
    }

    const endpoint = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;

    // 1. Prepare Meta Template payload
    const templateData = getCloudApiTemplatePayload(kind, normalized, lang);
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateData.templateName,
        language: { code: templateData.languageCode },
        components: [
          {
            type: 'body',
            parameters: templateData.bodyParameters,
          },
        ],
      },
    };

    try {
      // 2. Dispatch to Meta Graph API
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templatePayload),
      });

      let json = await response.json();

      // If template fails (e.g. template not yet approved in test WABA), attempt text message fallback
      if (!response.ok && json.error?.code === 132000) {
        console.warn(
          '[WhatsAppCloudApi] Template not found/approved. Attempting freeform text fallback for test number...'
        );

        const textPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageText,
          },
        };

        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(textPayload),
        });

        json = await response.json();
      }

      if (!response.ok) {
        const errorMsg = json.error?.message || response.statusText;
        console.error('[WhatsAppCloudApi] Meta API Error:', json);

        const failedId = `cloud-err-${Date.now()}`;
        await logMessage({
          restaurantId: normalized.id ? undefined : 'shree-theur-main',
          bookingId: normalized.id.startsWith('temp-') ? null : normalized.id,
          recipientPhone,
          messageType: kind,
          provider: 'cloud_api',
          status: 'failed',
          messageId: failedId,
          payload: {
            metaError: json.error,
            waUrl,
            textPreview: messageText.substring(0, 160),
          },
        });

        return {
          success: false,
          provider: 'cloud_api',
          kind,
          recipientPhone,
          text: messageText,
          url: waUrl,
          messageId: failedId,
          status: 'failed',
          error: `Meta Graph API error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
          customerActionUrl: waUrl,
          formattedMessageMarathi: textMr,
          formattedMessageEnglish: textEn,
        };
      }

      // 3. Successfully queued by Meta
      const metaMessageId = json.messages?.[0]?.id || `wamid-${Date.now()}`;

      await logMessage({
        restaurantId: normalized.id ? undefined : 'shree-theur-main',
        bookingId: normalized.id.startsWith('temp-') ? null : normalized.id,
        recipientPhone,
        messageType: kind,
        provider: 'cloud_api',
        status: 'sent',
        messageId: metaMessageId,
        payload: {
          wamid: metaMessageId,
          template: templateData.templateName,
          language: templateData.languageCode,
          metaResponse: json,
          textPreview: messageText.substring(0, 160),
        },
      });

      return {
        success: true,
        provider: 'cloud_api',
        kind,
        recipientPhone,
        text: messageText,
        url: waUrl,
        messageId: metaMessageId,
        status: 'sent',
        timestamp: new Date().toISOString(),
        customerActionUrl: waUrl,
        formattedMessageMarathi: textMr,
        formattedMessageEnglish: textEn,
      };
    } catch (err: any) {
      console.error('[WhatsAppCloudApi] Network exception calling Meta API:', err);

      const errId = `cloud-network-err-${Date.now()}`;
      await logMessage({
        restaurantId: normalized.id ? undefined : 'shree-theur-main',
        bookingId: normalized.id.startsWith('temp-') ? null : normalized.id,
        recipientPhone,
        messageType: kind,
        provider: 'cloud_api',
        status: 'failed',
        messageId: errId,
        payload: {
          networkError: err.message,
          waUrl,
        },
      });

      return {
        success: false,
        provider: 'cloud_api',
        kind,
        recipientPhone,
        text: messageText,
        url: waUrl,
        messageId: errId,
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString(),
        customerActionUrl: waUrl,
        formattedMessageMarathi: textMr,
        formattedMessageEnglish: textEn,
      };
    }
  }

  // Legacy helper methods
  async sendBookingConfirmation(
    payload: BookingMessagePayload,
    preferredLocale: Locale = 'en'
  ): Promise<SendMessageResult> {
    return this.sendMessage('guest_confirmed', payload, preferredLocale);
  }

  async sendBookingStatusUpdate(
    payload: BookingMessagePayload,
    status: string,
    estimatedPrepTimeMinutes?: number,
    preferredLocale: Locale = 'en'
  ): Promise<SendMessageResult> {
    const enriched = {
      ...payload,
      prepTimeMins: estimatedPrepTimeMinutes,
    };
    if (status.toUpperCase() === 'CONFIRMED') {
      return this.sendMessage('guest_confirmed', enriched, preferredLocale);
    } else if (status.toUpperCase() === 'REJECTED') {
      return this.sendMessage('guest_rejected', enriched, preferredLocale);
    }
    return this.sendMessage('guest_confirmed', enriched, preferredLocale);
  }
}
