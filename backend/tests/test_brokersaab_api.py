"""BrokerSaab end-to-end backend API tests.

Covers: categories, advisors, OTP auth (client + advisor signup), bookings,
quotes -> ticket -> stages -> close, wallet add/debit, commission payout.
"""

import os
import time
import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if BASE is None:
    # Read from frontend/.env directly as fallback (we run pytest in container)
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break
assert BASE, "Backend URL missing"
API = f"{BASE}/api"


# Shared state across tests
STATE = {}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Categories & Advisors ----------------
def test_categories_returns_19(s):
    r = s.get(f"{API}/categories", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 19, f"Expected 19 categories got {len(data)}"
    assert all("id" in c and "name" in c for c in data)


def test_advisors_list_and_sort(s):
    r = s.get(f"{API}/advisors", timeout=20)
    assert r.status_code == 200
    advs = r.json()
    assert len(advs) >= 8, f"Expected >=8 advisors, got {len(advs)}"
    # All authorized dealers must come before non-authorized
    auth_flags = [a["is_authorized_dealer"] for a in advs]
    last_auth = -1
    for i, flag in enumerate(auth_flags):
        if flag:
            last_auth = i
    first_nonauth = next((i for i, f in enumerate(auth_flags) if not f), len(advs))
    assert last_auth < first_nonauth, "Authorized dealers not sorted first"
    STATE["advisor_id"] = advs[0]["id"]
    assert advs[0]["is_authorized_dealer"] is True


def test_advisors_filter_by_category(s):
    r = s.get(f"{API}/advisors", params={"category": "m1"}, timeout=20)
    assert r.status_code == 200
    advs = r.json()
    assert len(advs) >= 1
    for a in advs:
        assert "m1" in a["categories"]


def test_advisor_detail(s):
    aid = STATE["advisor_id"]
    r = s.get(f"{API}/advisors/{aid}", timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == aid
    assert isinstance(d.get("availability"), list)
    assert len(d["availability"]) > 0


# ---------------- Client OTP flow ----------------
CLIENT_PHONE = "9999999999"


def test_otp_send_client(s):
    r = s.post(f"{API}/auth/otp/send", json={"phone": CLIENT_PHONE, "role": "client"}, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("sent") is True
    assert "dev_otp" in j
    STATE["client_otp"] = j["dev_otp"]


def test_otp_verify_client_new(s):
    # First, ensure this phone isn't already registered from prior runs by sending OTP again
    r = s.post(f"{API}/auth/otp/verify", json={"phone": CLIENT_PHONE, "otp": STATE["client_otp"], "role": "client"}, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    # is_new may be False if previous runs created user. Either way must succeed.
    assert "is_new" in j


def test_register_complete_client_and_welcome_credit(s):
    r = s.post(f"{API}/auth/register/complete", json={
        "phone": CLIENT_PHONE, "role": "client", "full_name": "TEST Client", "email": "test_client@example.com"
    }, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("token")
    STATE["client_token"] = j["token"]
    STATE["client_id"] = j["user"]["id"]
    # Welcome bonus only for genuinely new client. If existing, balance may already exist.
    assert j["user"]["wallet_balance"] >= 500


def test_auth_me_client(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200
    u = r.json()
    assert u["role"] == "client"
    assert u["phone"] == CLIENT_PHONE


# ---------------- Booking ----------------
def test_create_booking_wallet(s):
    aid = STATE["advisor_id"]
    # Pre balance
    me = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()
    pre_bal = me["wallet_balance"]
    detail = s.get(f"{API}/advisors/{aid}").json()
    fee = detail["consultation_fee"]
    # Ensure enough balance: top up if needed
    if pre_bal < fee:
        s.post(f"{API}/wallet/add", json={"amount": fee + 100}, headers=auth_headers(STATE["client_token"]))
        pre_bal = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()["wallet_balance"]
    r = s.post(f"{API}/bookings", json={
        "advisor_id": aid,
        "slot_date": "2026-02-15",
        "slot_time": "10:00",
        "mode": "VIDEO",
        "note": "TEST booking",
        "payment_method": "WALLET",
    }, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "ACCEPTED"
    assert b["amount"] == fee
    # Verify wallet debit
    me2 = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()
    assert round(pre_bal - me2["wallet_balance"], 2) == round(fee, 2)
    STATE["booking_id"] = b["id"]


def test_list_bookings(s):
    r = s.get(f"{API}/bookings", headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200
    bs = r.json()
    ids = [b["id"] for b in bs]
    assert STATE["booking_id"] in ids


# ---------------- Quote request ----------------
def test_request_quote(s):
    r = s.post(f"{API}/quotes", json={
        "advisor_id": STATE["advisor_id"],
        "category": "m1",
        "message": "TEST need quote",
    }, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["status"] == "REQUESTED"
    STATE["quote_id"] = q["id"]


# ---------------- Advisor signup ----------------
ADVISOR_PHONE = "9888888880"


def test_advisor_signup(s):
    r = s.post(f"{API}/auth/advisor/signup", json={
        "phone": ADVISOR_PHONE,
        "full_name": "TEST Advisor",
        "email": "test_adv@example.com",
        "location": "Pune",
        "state": "Maharashtra",
        "experience_years": 4,
        "consultation_fee": 300,
        "categories": ["m1"],
        "advisor_type": "REGULAR",
    }, timeout=20)
    if r.status_code == 400 and "already exists" in r.text:
        # Reuse existing test advisor by triggering OTP login flow path: use admin override -> just skip if can't
        pytest.skip("Advisor already exists from prior run; cannot get token")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["advisor"]["status"] == "APPROVED"
    STATE["advisor_token"] = j["token"]
    STATE["new_advisor_id"] = j["user"]["id"]


def test_client_requests_quote_to_new_advisor(s):
    # Request a quote that the NEW advisor (we have token for) can submit
    r = s.post(f"{API}/quotes", json={
        "advisor_id": STATE["new_advisor_id"],
        "category": "m1",
        "message": "TEST need quote for new advisor",
    }, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    STATE["quote_id_to_new_adv"] = r.json()["id"]


def test_advisor_submit_quote(s):
    qid = STATE["quote_id_to_new_adv"]
    r = s.post(f"{API}/quotes/{qid}/submit", json={
        "line_items": [
            {"description": "Consultation", "amount": 200},
            {"description": "Document drafting", "amount": 300},
        ],
        "note": "TEST quote",
        "validity_hours": 24,
    }, headers=auth_headers(STATE["advisor_token"]), timeout=20)
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["status"] == "QUOTED"
    assert q["total"] == 500


def test_client_accept_quote_creates_ticket(s):
    qid = STATE["quote_id_to_new_adv"]
    # Ensure client wallet has 500+
    me = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()
    if me["wallet_balance"] < 500:
        s.post(f"{API}/wallet/add", json={"amount": 1000}, headers=auth_headers(STATE["client_token"]))
    pre_bal = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()["wallet_balance"]
    r = s.post(f"{API}/quotes/{qid}/accept", json={"payment_method": "WALLET"}, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["status"] == "OPEN"
    assert t["total"] == 500
    STATE["ticket_id"] = t["id"]
    post_bal = s.get(f"{API}/auth/me", headers=auth_headers(STATE["client_token"])).json()["wallet_balance"]
    assert round(pre_bal - post_bal, 2) == 500.0


def test_advisor_adds_stage_and_updates(s):
    tid = STATE["ticket_id"]
    r = s.post(f"{API}/tickets/{tid}/stages", json={"title": "Initial review", "description": "TEST stage"}, headers=auth_headers(STATE["advisor_token"]), timeout=20)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["status"] == "IN_PROGRESS"
    assert len(t["stages"]) == 1
    stage_id = t["stages"][0]["id"]
    STATE["stage_id"] = stage_id
    # Move to AWAITING_CONFIRM
    r2 = s.patch(f"{API}/tickets/{tid}/stages/{stage_id}", json={"status": "AWAITING_CONFIRM"}, headers=auth_headers(STATE["advisor_token"]), timeout=20)
    assert r2.status_code == 200, r2.text
    t2 = r2.json()
    assert t2["stages"][0]["status"] == "AWAITING_CONFIRM"


def test_client_confirms_stage(s):
    tid = STATE["ticket_id"]
    sid = STATE["stage_id"]
    r = s.post(f"{API}/tickets/{tid}/stages/{sid}/confirm", headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["stages"][0]["status"] == "CONFIRMED"


def test_client_closes_ticket_with_rating(s):
    tid = STATE["ticket_id"]
    # Advisor pre-balance
    adv_me_pre = s.get(f"{API}/wallet", headers=auth_headers(STATE["advisor_token"])).json()
    pre_bal = adv_me_pre["balance"]
    r = s.post(f"{API}/tickets/{tid}/close", json={"rating": 5, "review_text": "TEST great"}, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["status"] == "CLOSED"
    assert t["rating"] == 5
    # Advisor wallet credit = 85% of 500 = 425
    adv_me_post = s.get(f"{API}/wallet", headers=auth_headers(STATE["advisor_token"])).json()
    assert round(adv_me_post["balance"] - pre_bal, 2) == 425.0


# ---------------- Wallet ----------------
def test_wallet_get(s):
    r = s.get(f"{API}/wallet", headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200
    j = r.json()
    assert "balance" in j and "transactions" in j
    assert isinstance(j["transactions"], list)


def test_wallet_add(s):
    pre = s.get(f"{API}/wallet", headers=auth_headers(STATE["client_token"])).json()["balance"]
    r = s.post(f"{API}/wallet/add", json={"amount": 1000}, headers=auth_headers(STATE["client_token"]), timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert round(j["balance"] - pre, 2) == 1000.0
