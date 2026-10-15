/**
 * Unified messaging module interfaces.
 * Supports transparent swapping between Implementation 1 (wa.me demo click-to-chat links)
 * and Implementation 2 (Meta WhatsApp Cloud API).
 */

export type Locale = 'en' | 'hi' | 'mr';
export type MessageLanguage = 'en' | 'hi' | 'mr';

export type BookingType = 'table' | 'group_meal' | 'order_ahead';

export type MessageKind =
  | 'guest_confirmed'
  | 'guest_rejected'
  | 'guest_reminder'
  | 'owner_new_booking';

export type MessageStatus = 'draft' | 'sent' | 'delivered' | 'read' | 'failed';

export interface PreOrderItemInput {
  nameMr?: string;
  nameEn?: string;
  nameHi?: string;
  name?: string;
  quantity: number;
  price?: number;
}

/**
 * Universal Booking Input interface.
 * Flexible enough to accept camelCase or snake_case fields from either
 * BookingRecord or API request payloads.
 */
export interface BookingInput {
  id?: string;
  bookingId?: string;
  booking_id?: string;
  restaurant_id?: string;
  restaurantId?: string;

  tokenNumber?: string;
  token_number?: string;

  guestName?: string;
  guest_name?: string;

  guestPhone?: string;
  guest_phone?: string;

  partySize?: number;
  party_size?: number;
  guestCount?: number;

  type?: BookingType | string;
  bookingType?: BookingType | string;

  slotStart?: string;
  slot_start?: string;
  date?: string;
  timeSlot?: string;
  time?: string;

  rejectionReason?: string;
  rejection_reason?: string;

  nextAvailableSlot?: string;
  next_available_slot?: string;

  prepTimeMins?: number;
  prep_time_mins?: number;
  estimated_prep_time_mins?: number;

  restaurantName?: string;
  restaurant_name?: string;

  restaurantPhone?: string;
  restaurant_phone?: string;

  restaurantLocation?: string;
  restaurant_location?: string;

  totalEstimatedAmount?: number;
  total_estimated_amount?: number;

  notes?: string;
  specialRequests?: string;

  items?: PreOrderItemInput[];
  preOrderItems?: PreOrderItemInput[];
}

export interface NormalizedBooking {
  id: string;
  tokenNumber: string;
  guestName: string;
  guestPhone: string;
  cleanGuestPhone: string;
  partySize: number;
  bookingType: BookingType;
  bookingTypeMr: string;
  bookingTypeEn: string;
  bookingTypeHi?: string;
  date: string;
  time: string;
  slotStart: string;
  rejectionReason?: string;
  nextAvailableSlot: string;
  prepTimeMins?: number;
  restaurantName: string;
  restaurantPhone: string;
  cleanRestaurantPhone: string;
  restaurantLocation: string;
  totalEstimatedAmount?: number;
  notes?: string;
  items: Array<{ nameMr: string; nameEn: string; nameHi?: string; quantity: number; price?: number }>;
}

export interface SendMessageResult {
  success: boolean;
  provider: 'wa_me' | 'cloud_api';
  kind: MessageKind;
  recipientPhone: string;
  text: string;
  url?: string; // Generated wa.me deep link with pre-filled message
  messageId?: string;
  status: MessageStatus;
  error?: string;
  timestamp: string;

  // Backwards compatibility fields for older components
  customerActionUrl?: string;
  ownerActionUrl?: string;
  formattedMessageMarathi?: string;
  formattedMessageEnglish?: string;
}

export interface MessageLogRecord {
  id: string;
  restaurant_id: string;
  booking_id?: string | null;
  recipient_phone: string;
  message_type: MessageKind | string;
  provider: 'wa_me' | 'cloud_api';
  status: MessageStatus | string;
  payload: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface IMessagingProvider {
  /**
   * Primary single interface for messaging.
   */
  sendMessage(
    kind: MessageKind,
    booking: BookingInput,
    lang?: MessageLanguage
  ): Promise<SendMessageResult>;

  /**
   * Legacy method for backwards compatibility
   */
  sendBookingConfirmation?(
    payload: any,
    preferredLocale?: Locale
  ): Promise<SendMessageResult>;

  /**
   * Legacy method for backwards compatibility
   */
  sendBookingStatusUpdate?(
    payload: any,
    status: string,
    estimatedPrepTimeMinutes?: number,
    preferredLocale?: Locale
  ): Promise<SendMessageResult>;
}

// Re-export for legacy consumers
export type BookingMessagePayload = BookingInput;
