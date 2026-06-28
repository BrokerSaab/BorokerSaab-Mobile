# BrokerSaab Mobile MVP

Role-based mobile app (Client + Advisor) for the BrokerSaab advisory marketplace.

## Tech
- Expo Router + React Native (Expo SDK 54)
- FastAPI + MongoDB (motor) backend
- JWT auth via mocked OTP (dev OTP returned in API response)
- Mocked Razorpay payments (instant wallet add / badge subscribe)

## Demo flow
1. Open app → role select (Client / Advisor) → enter phone → OTP shown in UI → verify
2. Client: Discover advisors → tap card → Book consultation (Wallet pay) or Request Quote
3. Advisor: signs up via onboarding (auto-approved for MVP) → Dashboard → Respond to quotes / manage tickets

## Seeded data
- 28 categories (m1-m19 + open slots)
- 8 demo advisors across India (some with Authorized Dealer badge)
- New clients receive ₹500 welcome wallet credit

## Notes
- OTP / Payments are MOCKED (clearly labelled in UI)
- Admin module (super/sub admin) deferred — covered by BRD but not in MVP scope
- 15% platform commission applied on bookings & tickets at payout
