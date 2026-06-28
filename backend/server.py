from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, random, logging, asyncio, jwt as pyjwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

JWT_SECRET = "brokersaab-dev-secret"
JWT_ALG = "HS256"
COMMISSION_PCT = 0.15

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")
log = logging.getLogger("brokersaab")
logging.basicConfig(level=logging.INFO)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth token")
    try:
        token = authorization.split(" ", 1)[1]
        data = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": data["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ---------- Models ----------
class OTPSendIn(BaseModel):
    phone: str
    role: Literal["client", "advisor"] = "client"


class OTPVerifyIn(BaseModel):
    phone: str
    otp: str
    role: Literal["client", "advisor"] = "client"


class RegisterCompleteIn(BaseModel):
    phone: str
    role: Literal["client", "advisor"] = "client"
    full_name: str
    email: Optional[str] = None


class AdvisorOnboardingIn(BaseModel):
    phone: str
    full_name: str
    email: str
    business_name: Optional[str] = ""
    bio: Optional[str] = ""
    location: str
    state: str
    experience_years: int = 0
    consultation_fee: float = 0
    languages: List[str] = []
    categories: List[str] = []
    advisor_type: Literal["REGULAR", "AUTHORIZED"] = "REGULAR"
    aadhaar_last4: Optional[str] = ""
    avatar_url: Optional[str] = ""


class BookingIn(BaseModel):
    advisor_id: str
    slot_date: str  # YYYY-MM-DD
    slot_time: str  # HH:MM
    mode: Literal["PHONE", "VIDEO", "CHAT", "PHYSICAL"]
    note: Optional[str] = ""
    payment_method: Literal["WALLET", "RAZORPAY"] = "WALLET"


class QuoteRequestIn(BaseModel):
    advisor_id: str
    category: str
    message: str


class QuoteLineItem(BaseModel):
    description: str
    amount: float


class QuoteSubmitIn(BaseModel):
    line_items: List[QuoteLineItem]
    note: Optional[str] = ""
    validity_hours: int = 48


class AcceptQuoteIn(BaseModel):
    payment_method: Literal["WALLET", "RAZORPAY"] = "WALLET"


class StageIn(BaseModel):
    title: str
    description: Optional[str] = ""


class StageUpdateIn(BaseModel):
    status: Literal["PENDING", "IN_PROGRESS", "AWAITING_CONFIRM"]


class CommentIn(BaseModel):
    text: str


class CloseTicketIn(BaseModel):
    rating: int
    review_text: Optional[str] = ""


class WalletAddIn(BaseModel):
    amount: float


# ---------- Helpers ----------
PROJ = {"_id": 0}


async def adjust_wallet(user_id: str, delta: float, txn_type: str, ref: str = "", description: str = ""):
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": delta}})
    await db.wallet_transactions.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "amount": delta,
        "type": txn_type,
        "ref": ref,
        "description": description,
        "status": "SUCCESS",
        "created_at": now_iso(),
    })


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "role": user["role"],
        "phone": user["phone"],
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "avatar_url": user.get("avatar_url", ""),
        "wallet_balance": user.get("wallet_balance", 0),
        "advisor": user.get("advisor"),  # nested advisor profile if role=advisor
    }


def advisor_card(user: dict) -> dict:
    a = user.get("advisor", {}) or {}
    return {
        "id": user["id"],
        "full_name": user.get("full_name", ""),
        "business_name": a.get("business_name", ""),
        "avatar_url": user.get("avatar_url", "") or a.get("avatar_url", ""),
        "cover_url": a.get("cover_url", ""),
        "bio": a.get("bio", ""),
        "location": a.get("location", ""),
        "state": a.get("state", ""),
        "experience_years": a.get("experience_years", 0),
        "consultation_fee": a.get("consultation_fee", 0),
        "languages": a.get("languages", []),
        "categories": a.get("categories", []),
        "advisor_type": a.get("advisor_type", "REGULAR"),
        "is_authorized_dealer": a.get("is_authorized_dealer", False),
        "status": a.get("status", "PENDING"),
        "rating": a.get("rating", 4.6),
        "reviews_count": a.get("reviews_count", 0),
        "availability": a.get("availability", []),
        "specializations": a.get("specializations", []),
    }


# ---------- Auth ----------
@api.post("/auth/otp/send")
async def otp_send(data: OTPSendIn):
    if not (data.phone.isdigit() and len(data.phone) == 10 and data.phone[0] in "6789"):
        raise HTTPException(400, "Invalid phone")
    otp = "{:06d}".format(random.randint(100000, 999999))
    await db.otp_codes.update_one(
        {"phone": data.phone},
        {"$set": {"otp": otp, "created_at": now_iso(), "role": data.role}},
        upsert=True,
    )
    log.info(f"OTP for {data.phone}: {otp}")
    # Dev: return otp in response so app can show it
    return {"sent": True, "dev_otp": otp}


@api.post("/auth/otp/verify")
async def otp_verify(data: OTPVerifyIn):
    rec = await db.otp_codes.find_one({"phone": data.phone}, PROJ)
    if not rec or rec.get("otp") != data.otp:
        raise HTTPException(400, "Invalid OTP")
    user = await db.users.find_one({"phone": data.phone, "role": data.role}, PROJ)
    if user:
        token = make_token(user["id"], user["role"])
        return {"token": token, "is_new": False, "user": public_user(user)}
    return {"token": None, "is_new": True, "phone": data.phone, "role": data.role}


@api.post("/auth/register/complete")
async def register_complete(data: RegisterCompleteIn):
    existing = await db.users.find_one({"phone": data.phone, "role": data.role}, PROJ)
    if existing:
        token = make_token(existing["id"], existing["role"])
        return {"token": token, "user": public_user(existing)}
    user_id = new_id()
    user = {
        "id": user_id,
        "role": data.role,
        "phone": data.phone,
        "full_name": data.full_name,
        "email": data.email or "",
        "wallet_balance": 500.0 if data.role == "client" else 0.0,
        "avatar_url": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    if data.role == "client":
        await db.wallet_transactions.insert_one({
            "id": new_id(), "user_id": user_id, "amount": 500.0,
            "type": "CREDIT", "ref": "welcome", "description": "Welcome bonus",
            "status": "SUCCESS", "created_at": now_iso(),
        })
    user = await db.users.find_one({"id": user_id}, PROJ)
    token = make_token(user_id, data.role)
    return {"token": token, "user": public_user(user)}


@api.post("/auth/advisor/signup")
async def advisor_signup(data: AdvisorOnboardingIn):
    existing = await db.users.find_one({"phone": data.phone, "role": "advisor"}, PROJ)
    if existing:
        raise HTTPException(400, "Advisor already exists for this phone")
    user_id = new_id()
    # Default availability: Mon-Fri 10:00-13:00, 15:00-18:00
    default_avail = []
    for day in [1, 2, 3, 4, 5]:
        default_avail.append({"day": day, "start": "10:00", "end": "13:00"})
        default_avail.append({"day": day, "start": "15:00", "end": "18:00"})
    user = {
        "id": user_id,
        "role": "advisor",
        "phone": data.phone,
        "full_name": data.full_name,
        "email": data.email,
        "avatar_url": data.avatar_url,
        "wallet_balance": 0.0,
        "created_at": now_iso(),
        "advisor": {
            "business_name": data.business_name,
            "bio": data.bio,
            "location": data.location,
            "state": data.state,
            "experience_years": data.experience_years,
            "consultation_fee": data.consultation_fee,
            "languages": data.languages,
            "categories": data.categories,
            "advisor_type": data.advisor_type,
            "is_authorized_dealer": False,
            "status": "APPROVED",  # Auto-approve for MVP
            "rating": 0,
            "reviews_count": 0,
            "availability": default_avail,
            "specializations": [],
            "aadhaar_last4": data.aadhaar_last4,
            "cover_url": "",
        },
    }
    await db.users.insert_one(user)
    user = await db.users.find_one({"id": user_id}, PROJ)
    token = make_token(user_id, "advisor")
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user=Depends(get_user)):
    return public_user(user)


# ---------- Categories ----------
@api.get("/categories")
async def categories():
    cats = await db.categories.find({}, PROJ).to_list(100)
    return cats


# ---------- Advisors ----------
@api.get("/advisors")
async def list_advisors(
    category: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = None,
):
    q = {"role": "advisor", "advisor.status": "APPROVED"}
    if category:
        q["advisor.categories"] = category
    if state:
        q["advisor.state"] = state
    if min_rating is not None:
        q["advisor.rating"] = {"$gte": min_rating}
    cursor = db.users.find(q, PROJ).limit(100)
    advisors = []
    async for u in cursor:
        if search:
            s = search.lower()
            blob = (u.get("full_name", "") + " " + (u.get("advisor", {}) or {}).get("business_name", "") + " " + (u.get("advisor", {}) or {}).get("location", "")).lower()
            if s not in blob:
                continue
        advisors.append(advisor_card(u))
    # Sort: authorized dealers first, then rating
    advisors.sort(key=lambda a: (not a["is_authorized_dealer"], -a["rating"]))
    return advisors


@api.get("/advisors/{advisor_id}")
async def advisor_detail(advisor_id: str):
    u = await db.users.find_one({"id": advisor_id, "role": "advisor"}, PROJ)
    if not u:
        raise HTTPException(404, "Advisor not found")
    return advisor_card(u)


# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(data: BookingIn, user=Depends(get_user)):
    if user["role"] != "client":
        raise HTTPException(403, "Clients only")
    advisor = await db.users.find_one({"id": data.advisor_id, "role": "advisor"}, PROJ)
    if not advisor:
        raise HTTPException(404, "Advisor not found")
    fee = (advisor.get("advisor") or {}).get("consultation_fee", 0)
    if data.payment_method == "WALLET":
        if user.get("wallet_balance", 0) < fee:
            raise HTTPException(400, "Insufficient wallet balance")
        await adjust_wallet(user["id"], -fee, "DEBIT", "booking", "Booking payment")
    booking_id = new_id()
    booking = {
        "id": booking_id,
        "client_id": user["id"],
        "client_name": user["full_name"],
        "advisor_id": data.advisor_id,
        "advisor_name": advisor["full_name"],
        "advisor_avatar": advisor.get("avatar_url", ""),
        "slot_date": data.slot_date,
        "slot_time": data.slot_time,
        "mode": data.mode,
        "note": data.note,
        "amount": fee,
        "status": "ACCEPTED",
        "payment_method": data.payment_method,
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    return {k: v for k, v in booking.items() if k != "_id"}


@api.get("/bookings")
async def list_bookings(user=Depends(get_user)):
    if user["role"] == "client":
        cur = db.bookings.find({"client_id": user["id"]}, PROJ).sort("created_at", -1)
    else:
        cur = db.bookings.find({"advisor_id": user["id"]}, PROJ).sort("created_at", -1)
    return await cur.to_list(200)


@api.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, user=Depends(get_user)):
    if user["role"] != "advisor":
        raise HTTPException(403, "Advisors only")
    b = await db.bookings.find_one({"id": booking_id, "advisor_id": user["id"]}, PROJ)
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] == "COMPLETED":
        return b
    payout = round(b["amount"] * (1 - COMMISSION_PCT), 2)
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "COMPLETED", "completed_at": now_iso()}})
    if payout > 0:
        await adjust_wallet(user["id"], payout, "PAYOUT", booking_id, f"Booking payout (after 15% commission)")
    return await db.bookings.find_one({"id": booking_id}, PROJ)


# ---------- Quotes ----------
@api.post("/quotes")
async def request_quote(data: QuoteRequestIn, user=Depends(get_user)):
    if user["role"] != "client":
        raise HTTPException(403, "Clients only")
    advisor = await db.users.find_one({"id": data.advisor_id, "role": "advisor"}, PROJ)
    if not advisor:
        raise HTTPException(404, "Advisor not found")
    q = {
        "id": new_id(),
        "client_id": user["id"],
        "client_name": user["full_name"],
        "advisor_id": data.advisor_id,
        "advisor_name": advisor["full_name"],
        "category": data.category,
        "message": data.message,
        "status": "REQUESTED",
        "line_items": [],
        "advisor_note": "",
        "total": 0,
        "created_at": now_iso(),
    }
    await db.quotes.insert_one(q)
    return {k: v for k, v in q.items() if k != "_id"}


@api.get("/quotes")
async def list_quotes(user=Depends(get_user)):
    field = "client_id" if user["role"] == "client" else "advisor_id"
    cur = db.quotes.find({field: user["id"]}, PROJ).sort("created_at", -1)
    return await cur.to_list(200)


@api.post("/quotes/{quote_id}/submit")
async def submit_quote(quote_id: str, data: QuoteSubmitIn, user=Depends(get_user)):
    if user["role"] != "advisor":
        raise HTTPException(403, "Advisors only")
    q = await db.quotes.find_one({"id": quote_id, "advisor_id": user["id"]}, PROJ)
    if not q:
        raise HTTPException(404, "Quote not found")
    total = sum(item.amount for item in data.line_items)
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "line_items": [item.dict() for item in data.line_items],
            "advisor_note": data.note,
            "validity_hours": data.validity_hours,
            "total": total,
            "status": "QUOTED",
            "submitted_at": now_iso(),
        }},
    )
    return await db.quotes.find_one({"id": quote_id}, PROJ)


@api.post("/quotes/{quote_id}/accept")
async def accept_quote(quote_id: str, data: AcceptQuoteIn, user=Depends(get_user)):
    if user["role"] != "client":
        raise HTTPException(403, "Clients only")
    q = await db.quotes.find_one({"id": quote_id, "client_id": user["id"]}, PROJ)
    if not q:
        raise HTTPException(404, "Quote not found")
    if q["status"] != "QUOTED":
        raise HTTPException(400, "Quote not in QUOTED state")
    total = q["total"]
    if data.payment_method == "WALLET":
        if user.get("wallet_balance", 0) < total:
            raise HTTPException(400, "Insufficient wallet balance")
        await adjust_wallet(user["id"], -total, "DEBIT", quote_id, "Quote payment (escrow)")
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "ACCEPTED", "accepted_at": now_iso()}})
    # Create escrow ticket
    ticket_id = new_id()
    ticket = {
        "id": ticket_id,
        "quote_id": quote_id,
        "client_id": user["id"],
        "client_name": user["full_name"],
        "advisor_id": q["advisor_id"],
        "advisor_name": q["advisor_name"],
        "category": q["category"],
        "total": total,
        "status": "OPEN",
        "stages": [],
        "comments": [],
        "created_at": now_iso(),
    }
    await db.tickets.insert_one(ticket)
    return {k: v for k, v in ticket.items() if k != "_id"}


# ---------- Tickets ----------
@api.get("/tickets")
async def list_tickets(user=Depends(get_user)):
    field = "client_id" if user["role"] == "client" else "advisor_id"
    cur = db.tickets.find({field: user["id"]}, PROJ).sort("created_at", -1)
    return await cur.to_list(200)


@api.get("/tickets/{ticket_id}")
async def ticket_detail(ticket_id: str, user=Depends(get_user)):
    t = await db.tickets.find_one({"id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(404, "Ticket not found")
    if user["id"] not in (t["client_id"], t["advisor_id"]):
        raise HTTPException(403, "Forbidden")
    return t


@api.post("/tickets/{ticket_id}/stages")
async def add_stage(ticket_id: str, data: StageIn, user=Depends(get_user)):
    if user["role"] != "advisor":
        raise HTTPException(403, "Advisors only")
    t = await db.tickets.find_one({"id": ticket_id, "advisor_id": user["id"]}, PROJ)
    if not t:
        raise HTTPException(404, "Ticket not found")
    stage = {
        "id": new_id(),
        "title": data.title,
        "description": data.description,
        "status": "PENDING",
        "created_at": now_iso(),
    }
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"stages": stage}, "$set": {"status": "IN_PROGRESS"}},
    )
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api.patch("/tickets/{ticket_id}/stages/{stage_id}")
async def update_stage(ticket_id: str, stage_id: str, data: StageUpdateIn, user=Depends(get_user)):
    if user["role"] != "advisor":
        raise HTTPException(403, "Advisors only")
    res = await db.tickets.update_one(
        {"id": ticket_id, "advisor_id": user["id"], "stages.id": stage_id},
        {"$set": {"stages.$.status": data.status, "stages.$.updated_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Stage not found")
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api.post("/tickets/{ticket_id}/stages/{stage_id}/confirm")
async def confirm_stage(ticket_id: str, stage_id: str, user=Depends(get_user)):
    if user["role"] != "client":
        raise HTTPException(403, "Clients only")
    res = await db.tickets.update_one(
        {"id": ticket_id, "client_id": user["id"], "stages.id": stage_id},
        {"$set": {"stages.$.status": "CONFIRMED", "stages.$.confirmed_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Stage not found")
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api.post("/tickets/{ticket_id}/comments")
async def add_comment(ticket_id: str, data: CommentIn, user=Depends(get_user)):
    t = await db.tickets.find_one({"id": ticket_id}, PROJ)
    if not t or user["id"] not in (t["client_id"], t["advisor_id"]):
        raise HTTPException(404, "Ticket not found")
    comment = {
        "id": new_id(),
        "author_id": user["id"],
        "author_name": user["full_name"],
        "author_role": user["role"],
        "text": data.text,
        "created_at": now_iso(),
    }
    await db.tickets.update_one({"id": ticket_id}, {"$push": {"comments": comment}})
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str, data: CloseTicketIn, user=Depends(get_user)):
    if user["role"] != "client":
        raise HTTPException(403, "Clients only")
    t = await db.tickets.find_one({"id": ticket_id, "client_id": user["id"]}, PROJ)
    if not t:
        raise HTTPException(404, "Ticket not found")
    if t["status"] == "CLOSED":
        return t
    payout = round(t["total"] * (1 - COMMISSION_PCT), 2)
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "status": "CLOSED",
            "closed_at": now_iso(),
            "rating": data.rating,
            "review_text": data.review_text,
        }},
    )
    await adjust_wallet(t["advisor_id"], payout, "PAYOUT", ticket_id, f"Ticket payout (after 15% commission)")
    # Update advisor rating
    adv = await db.users.find_one({"id": t["advisor_id"]}, PROJ)
    if adv and adv.get("advisor"):
        a = adv["advisor"]
        cur_r = a.get("rating", 0) or 0
        cur_n = a.get("reviews_count", 0) or 0
        new_n = cur_n + 1
        new_r = round(((cur_r * cur_n) + data.rating) / new_n, 2)
        await db.users.update_one(
            {"id": t["advisor_id"]},
            {"$set": {"advisor.rating": new_r, "advisor.reviews_count": new_n}},
        )
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


# ---------- Wallet ----------
@api.get("/wallet")
async def wallet(user=Depends(get_user)):
    txns = await db.wallet_transactions.find({"user_id": user["id"]}, PROJ).sort("created_at", -1).limit(100).to_list(100)
    return {"balance": user.get("wallet_balance", 0), "transactions": txns}


@api.post("/wallet/add")
async def wallet_add(data: WalletAddIn, user=Depends(get_user)):
    if data.amount <= 0:
        raise HTTPException(400, "Invalid amount")
    await adjust_wallet(user["id"], data.amount, "CREDIT", "topup", "Wallet top-up (Razorpay - mocked)")
    refreshed = await db.users.find_one({"id": user["id"]}, PROJ)
    return {"balance": refreshed.get("wallet_balance", 0)}


# ---------- Seed ----------
CATEGORIES = [
    ("m1", "Life Insurance", "shield-checkmark"),
    ("m2", "Health Insurance", "medkit"),
    ("m3", "Motor Insurance", "car"),
    ("m4", "Property Insurance", "home"),
    ("m5", "Travel Insurance", "airplane"),
    ("m6", "Crop Insurance", "leaf"),
    ("m7", "Marine Insurance", "boat"),
    ("m8", "Commercial Insurance", "business"),
    ("m9", "Mutual Funds", "trending-up"),
    ("m10", "Stock Advisory", "stats-chart"),
    ("m11", "Fixed Deposits", "wallet"),
    ("m12", "Real Estate", "construct"),
    ("m13", "Tax Planning", "calculator"),
    ("m14", "Legal Advisory", "library"),
    ("m15", "Loan Advisory", "cash"),
    ("m16", "Gold & Commodity", "diamond"),
    ("m17", "NRI Services", "globe"),
    ("m18", "Retirement Planning", "hourglass"),
    ("m19", "Business Advisory", "briefcase"),
]

DEMO_ADVISORS = [
    {"name": "Ravi Kumar", "biz": "Kumar Advisory Services", "loc": "Lucknow", "state": "Uttar Pradesh", "fee": 500, "yrs": 12, "cats": ["m1", "m2", "m3"], "type": "AUTHORIZED", "auth": True, "rating": 4.8, "n": 23, "langs": ["English", "Hindi"], "bio": "12+ years helping families secure their financial future via tailored insurance & investment plans."},
    {"name": "Priya Sharma", "biz": "Sharma Financial", "loc": "Delhi", "state": "Delhi", "fee": 300, "yrs": 8, "cats": ["m9", "m10", "m13"], "type": "AUTHORIZED", "auth": True, "rating": 4.5, "n": 11, "langs": ["English", "Hindi"], "bio": "SEBI-registered advisor with a focus on mutual funds and tax-efficient investing."},
    {"name": "Amit Verma", "biz": "AV Consulting", "loc": "Mumbai", "state": "Maharashtra", "fee": 400, "yrs": 5, "cats": ["m14", "m13"], "type": "REGULAR", "auth": False, "rating": 4.2, "n": 5, "langs": ["English", "Hindi", "Marathi"], "bio": "Legal advisor for property registry, GST and contract review."},
    {"name": "Neha Iyer", "biz": "Iyer Wealth", "loc": "Bengaluru", "state": "Karnataka", "fee": 600, "yrs": 10, "cats": ["m9", "m18", "m11"], "type": "AUTHORIZED", "auth": True, "rating": 4.7, "n": 18, "langs": ["English", "Tamil", "Kannada"], "bio": "Wealth planning specialist for IT professionals and HNIs."},
    {"name": "Rohit Singh", "biz": "Singh Insurance Co", "loc": "Jaipur", "state": "Rajasthan", "fee": 250, "yrs": 6, "cats": ["m1", "m2", "m4", "m5"], "type": "REGULAR", "auth": False, "rating": 4.3, "n": 9, "langs": ["English", "Hindi"], "bio": "Insurance generalist — life, health, property and travel cover at competitive rates."},
    {"name": "Sneha Patel", "biz": "Patel Tax Co", "loc": "Ahmedabad", "state": "Gujarat", "fee": 350, "yrs": 7, "cats": ["m13", "m15", "m19"], "type": "AUTHORIZED", "auth": True, "rating": 4.6, "n": 14, "langs": ["English", "Hindi", "Gujarati"], "bio": "CA-led tax filing, GST, and small business advisory."},
    {"name": "Arjun Reddy", "biz": "Reddy Realty Advisors", "loc": "Hyderabad", "state": "Telangana", "fee": 450, "yrs": 9, "cats": ["m12", "m15"], "type": "REGULAR", "auth": False, "rating": 4.4, "n": 7, "langs": ["English", "Telugu", "Hindi"], "bio": "Real estate transactions, home loan structuring and bainama work."},
    {"name": "Kavita Joshi", "biz": "Joshi NRI Services", "loc": "Pune", "state": "Maharashtra", "fee": 800, "yrs": 15, "cats": ["m17", "m13", "m9"], "type": "AUTHORIZED", "auth": True, "rating": 4.9, "n": 32, "langs": ["English", "Hindi", "Marathi"], "bio": "Specialized NRI tax, FEMA compliance and repatriation advisory."},
]


async def seed_if_empty():
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([
            {"id": c[0], "name": c[1], "icon": c[2]} for c in CATEGORIES
        ])
        log.info("Seeded categories")
    if await db.users.count_documents({"role": "advisor"}) == 0:
        avail = []
        for day in [1, 2, 3, 4, 5]:
            avail.append({"day": day, "start": "10:00", "end": "13:00"})
            avail.append({"day": day, "start": "15:00", "end": "18:00"})
        for i, d in enumerate(DEMO_ADVISORS):
            uid = new_id()
            await db.users.insert_one({
                "id": uid,
                "role": "advisor",
                "phone": f"98765400{i:02d}",
                "full_name": d["name"],
                "email": f"{d['name'].lower().replace(' ', '.')}@brokersaab.in",
                "avatar_url": "",
                "wallet_balance": 0.0,
                "created_at": now_iso(),
                "advisor": {
                    "business_name": d["biz"],
                    "bio": d["bio"],
                    "location": d["loc"],
                    "state": d["state"],
                    "experience_years": d["yrs"],
                    "consultation_fee": d["fee"],
                    "languages": d["langs"],
                    "categories": d["cats"],
                    "advisor_type": d["type"],
                    "is_authorized_dealer": d["auth"],
                    "status": "APPROVED",
                    "rating": d["rating"],
                    "reviews_count": d["n"],
                    "availability": avail,
                    "specializations": [],
                    "aadhaar_last4": "1234",
                    "cover_url": "",
                },
            })
        log.info("Seeded advisors")


@app.on_event("startup")
async def on_start():
    await seed_if_empty()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
