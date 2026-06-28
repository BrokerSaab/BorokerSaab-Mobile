# BrokerSaab Mobile MVP

Role-based mobile app (Client + Advisor) for the BrokerSaab advisory marketplace.

## Tech
- Expo Router + React Native (Expo SDK 54)
- FastAPI + MongoDB (motor) backend
- JWT auth via mocked OTP (dev OTP returned in API response)
- Mocked Razorpay payments (instant wallet add / badge subscribe)

## Demo flow
1. Open app → role select (Client / Advisor) → choose login method (OTP / Password) → enter phone → verify
2. Client: Discover advisors → tap card → Unlock contact (1 credit / FREE first) → Book consultation (Wallet pay) or Request Quote
3. Client Profile: edit name/email/avatar (base64 image picker), set password for future logins, view wallet, buy contact packs, view unlock history
4. Advisor: signs up via onboarding (auto-approved for MVP) → Dashboard → Respond to quotes / manage tickets

## User Management features (Module 1 from BRD)
- OTP login + Password set/login (bcrypt)
- Profile edit (name, email, avatar base64 upload)
- Wallet (add money, transactions, welcome bonus)
- Contact credit packs (4 tiers: Starter/Growth/Pro/Enterprise)
- Contact unlock (1st free, then 1 credit per advisor)
- Unlock history
- Active pack list with expiry

## Theme
- Navy #0B1F3A (primary)
- Indigo #4F46E5 (interactive accent)
- Gold #D4AF37 (premium markers)
- White surfaces

## Seeded data
- 28 categories (m1-m19 + open slots)
- 8 demo advisors across India (some with Authorized Dealer badge)
- New clients receive ₹500 welcome wallet credit

## Notes
- OTP / Payments are MOCKED (clearly labelled in UI)
- Admin module (super/sub admin) deferred — covered by BRD but not in MVP scope
- 15% platform commission applied on bookings & tickets at payout
