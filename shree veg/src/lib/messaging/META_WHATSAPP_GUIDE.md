# Meta WhatsApp Business Cloud API — Integration, Approval & Pricing Guide

This document outlines the architecture, setup process, Meta verification workflow, template approval guidelines, and pricing structure for **श्री प्युअर व्हेज (थेऊर फाटा)** before taking WhatsApp Cloud API live in production.

---

## 1. Architecture Overview

The system uses a unified interface:
```typescript
sendMessage(kind: MessageKind, booking: BookingInput, lang: 'mr' | 'en'): Promise<SendMessageResult>
```

| Component | Implementation 1 (Default / Demo) | Implementation 2 (Cloud API) |
| :--- | :--- | :--- |
| **Provider** | `wa.me` Click-to-Chat Link | Meta WhatsApp Business Cloud API (`v21.0`) |
| **Activation Flag** | `WHATSAPP_PROVIDER=wa_me` (Default) | `WHATSAPP_PROVIDER=cloud_api` |
| **Delivery Mechanism** | Generates deep link (`https://wa.me/...`) with pre-filled Marathi/English text. Admin clicks big button. | Direct HTTP call to Meta Graph API; message delivered silently in background to customer's WhatsApp. |
| **Logging** | Dispatches recorded in `public.message_log` table & in-memory cache. | Recorded in `public.message_log` with Meta's `wamid`; delivery status updated via Webhook (`sent` → `delivered` → `read`). |
| **Cost** | 100% Free (No Meta account or credit card needed) | Meta conversation pricing per 24-hr session (see Section 4). |

---

## 2. Meta Approval Steps Before Going Live

To transition from the test sandbox to live production with your official restaurant phone number, the following Meta steps must be completed on [Meta for Developers](https://developers.facebook.com/) and [Meta Business Manager](https://business.facebook.com/):

### Step A: Meta Business Manager & Verification
1. **Create or Log into Meta Business Account**:
   - Go to [business.facebook.com](https://business.facebook.com/).
   - Ensure the legal business name matches official documents (e.g., FSSAI license, GST certificate, or Udyam Aadhar for Shree Pure Veg).
2. **Complete Business Verification**:
   - Go to **Business Settings → Security Center → Business Verification**.
   - Upload business registration and address proof (utility bill, GST certificate).
   - *Verification takes 1 to 3 business days.* Without business verification, Meta limits sending to 250 unique customer phone numbers per 24-hour rolling window.

### Step B: WhatsApp Business Profile & Display Name Approval
1. **Register Dedicated Phone Number**:
   - The phone number **CANNOT** be currently active on the consumer WhatsApp or WhatsApp Business mobile app on a phone.
   - If using a SIM card number already on WhatsApp, delete the WhatsApp account on that SIM first (Settings → Account → Delete My Account), then register it in Meta WhatsApp Cloud API.
2. **Display Name Approval**:
   - Enter Display Name: e.g., `Shree Pure Veg Theur Phata`.
   - Ensure it strictly conforms to [Meta Display Name Guidelines](https://www.facebook.com/business/help/530599257678572). The name must represent the business brand and match website/social media presence.

### Step C: Message Template Submission & Approval
Meta classifies all proactive business-initiated messages outside the 24-hour service window into 3 categories:
1. **UTILITY (Our category)**: Transactional updates relating to an agreed-upon transaction (booking confirmations, status updates, appointment reminders).
2. **MARKETING**: Promotions, discount coupons, festival greetings with offers.
3. **AUTHENTICATION**: One-time passwords (OTPs).

#### Required Templates to Submit on Meta WhatsApp Manager:
Submit the following 4 templates in both **Marathi (mr)** and **English (en_US)** under the **UTILITY** category:

1. **`booking_confirmed_v1` (Utility)**
   - *Header*: None or Text `श्री प्युअर व्हेज आरक्षण पुष्टी`
   - *Body*: `नमस्ते {{1}} जी! आपले आरक्षण निश्चित झाले आहे. टोकन: #{{2}}, तारीख: {{3}}, वेळ: {{4}}, व्यक्ती: {{5}}. थेऊर फाटा, कुंजीरवाडी येथे आपले स्वागत!`
   - *Sample variables*: `1: सचिन`, `2: SV-101`, `3: 2026-10-15`, `4: 13:00`, `5: 4`

2. **`booking_rejected_v1` (Utility)**
   - *Body*: `नमस्ते {{1}} जी, क्षमस्व! {{2}} वेळेसाठी गर्दीमुळे आरक्षण स्वीकारणे शक्य झाले नाही. कारण: {{3}}. पुढील उपलब्ध वेळ: {{4}}. संपर्कासाठी: {{5}}.`
   - *Sample variables*: `1: सचिन`, `2: 13:00`, `3: Slot Full`, `4: 13:30 (10 seats free)`, `5: 9876543210`

3. **`booking_reminder_v1` (Utility)**
   - *Body*: `नमस्ते {{1}} जी! आपले आरक्षण टोकन #{{2}} आज {{3}} वाजता ({{4}} व्यक्ती) निश्चित आहे. पत्ता: श्री प्युअर व्हेज, थेऊर फाटा, पुणे-सोलापूर महामार्ग.`
   - *Sample variables*: `1: सचिन`, `2: SV-101`, `3: 13:00`, `4: 4`

4. **`booking_owner_alert_v1` (Utility)**
   - *Body*: `नवीन आरक्षण: टोकन #{{1}}, ग्राहक: {{2}}, फोन: {{3}}, वेळ: {{4}}, व्यक्ती: {{5}}. हॉटेल: श्री प्युअर व्हेज.`
   - *Sample variables*: `1: SV-101`, `2: सचिन`, `3: 9822012345`, `4: 13:00`, `5: 4`

> [!TIP]
> Templates submitted under **Utility** with clear transactional wording are typically approved by Meta AI within **2 to 15 minutes**. Avoid marketing buzzwords in utility templates to prevent rejection.

---

## 3. Meta Pricing Structure (India Rate Card)

Meta uses a **conversation-based pricing model** (24-hour conversation window beginning when the first message is delivered).

| Conversation Category | India (INR Rates approx.) | Details |
| :--- | :--- | :--- |
| **Service Conversations** (User-Initiated) | **FREE (First 1,000 / month)**, then ~₹0.35 | When a customer messages your restaurant first on WhatsApp, a 24-hour customer service window opens. |
| **Utility Conversations** (Business-Initiated) | **~₹0.11 to ₹0.15 per 24-hr window** | Triggered when the restaurant sends `guest_confirmed`, `guest_rejected`, or `guest_reminder`. All subsequent utility messages to that guest within 24 hours are **free**. |
| **Marketing Conversations** | **~₹0.78 to ₹0.90 per 24-hr window** | Only applies if you send mass festival promotions or offers. |

### Free Tier Benefits:
- Every WhatsApp Business Account receives **1,000 free Service conversations per month**.
- *Note*: As of Meta's latest rate card, Business-Initiated Utility templates are billed from message 1, but at a very low rate (~12 to 15 paise per 24-hour session in India).
- For a restaurant processing 500 bookings/month, monthly messaging cost is approximately **₹60 to ₹80 INR** total.

---

## 4. Webhook Setup for Live Delivery Status

To track message delivery (`sent` → `delivered` → `read`):
1. In Meta Developer App → WhatsApp → Configuration → **Webhooks**:
   - **Callback URL**: `https://your-domain.com/api/webhook/whatsapp`
   - **Verify Token**: Same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env.local` (e.g., `shree_veg_webhook_verify_secret`)
2. Click **Verify and Save**.
3. Under Webhook Fields, subscribe to:
   - `messages` (Handles incoming replies and message delivery status updates).

---

## 5. Official Meta Documentation Reference Links

Before taking Cloud API live, verify the latest terms and regional rate cards:
- [Meta WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform Pricing Rate Cards](https://developers.facebook.com/docs/whatsapp/pricing)
- [Meta Message Template Guidelines](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Display Name Guidelines](https://www.facebook.com/business/help/530599257678572)
- [Business Verification Guidelines](https://www.facebook.com/business/help/2058515294227817)

---

## 6. Pre-Flight Checklist Before Going Live

- [ ] SIM card freed from regular consumer WhatsApp.
- [ ] Meta Business Manager verified with GST / Business Certificate.
- [ ] Display Name `Shree Pure Veg Theur Phata` approved.
- [ ] 4 Utility templates (`booking_confirmed_v1`, `booking_rejected_v1`, `booking_reminder_v1`, `booking_owner_alert_v1`) approved in Meta Manager.
- [ ] Payment method (Credit/Debit Card) attached in Meta WhatsApp Business Account for Utility billing.
- [ ] Production Access Token and Phone Number ID updated in production environment variables (`WHATSAPP_PROVIDER=cloud_api`).
- [ ] Webhook URL registered and verified in Meta Dashboard.
