"""BrokerSaab User Management (Module 1) backend tests.

Covers: password set + phone-password login, profile edit, avatar upload,
contact packs, contact unlock flow (free first, credit-based subsequent),
insufficient credits.
"""

import os
import random
import time
import pytest
import requests
from pathlib import Path


def _load_base():
    base = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if not base:
        for line in Path("/app/frontend/.env").read_text().splitlines():
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                base = line.split("=", 1)[1].strip().strip('"')
                break
    assert base, "Backend URL missing"
    return base.rstrip("/")


BASE = _load_base()
API = f"{BASE}/api"


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def _new_phone():
    # 10-digit phone starting with 9, randomized
    return "98" + "".join(str(random.randint(0, 9)) for _ in range(8))


def _register_client(s, phone, name):
    r = s.post(f"{API}/auth/otp/send", json={"phone": phone, "role": "client"}, timeout=20)
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    r = s.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": otp, "role": "client"}, timeout=20)
    assert r.status_code == 200, r.text
    r = s.post(
        f"{API}/auth/register/complete",
        json={"phone": phone, "role": "client", "full_name": name, "email": f"{phone}@test.com"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def client_a(s):
    """Main client: used for password, profile, avatar, packs, unlock w/ credits."""
    phone = _new_phone()
    token, user = _register_client(s, phone, "TEST_UserMgmt A")
    return {"phone": phone, "token": token, "user": user}


@pytest.fixture(scope="module")
def client_b(s):
    """Secondary client: used for insufficient-credit unlock case."""
    phone = _new_phone()
    token, user = _register_client(s, phone, "TEST_UserMgmt B")
    return {"phone": phone, "token": token, "user": user}


@pytest.fixture(scope="module")
def advisor_ids(s):
    r = s.get(f"{API}/advisors", timeout=20)
    assert r.status_code == 200
    advs = r.json()
    assert len(advs) >= 3, "Need at least 3 advisors seeded"
    return [a["id"] for a in advs[:3]]


# ---------------- Password & Login ----------------
class TestPassword:
    def test_set_password_weak_400(self, s, client_a):
        r = s.post(f"{API}/auth/password/set", json={"password": "abc"},
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 400, r.text

    def test_set_password_strong_200(self, s, client_a):
        r = s.post(f"{API}/auth/password/set", json={"password": "Abcdef12"},
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_phone_password_login(self, s, client_a):
        r = s.post(
            f"{API}/auth/login/phone-password",
            json={"phone": client_a["phone"], "password": "Abcdef12", "role": "client"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("token")
        assert j["user"]["phone"] == client_a["phone"]
        assert j["user"]["role"] == "client"

    def test_phone_password_login_wrong(self, s, client_a):
        r = s.post(
            f"{API}/auth/login/phone-password",
            json={"phone": client_a["phone"], "password": "WrongPass1", "role": "client"},
            timeout=20,
        )
        assert r.status_code == 400


# ---------------- Profile ----------------
class TestProfile:
    def test_update_profile(self, s, client_a):
        r = s.patch(
            f"{API}/users/me/profile",
            json={"full_name": "TEST UserMgmt Updated", "email": "updated@test.com"},
            headers=_hdr(client_a["token"]),
            timeout=20,
        )
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["full_name"] == "TEST UserMgmt Updated"
        assert u["email"] == "updated@test.com"
        # Persisted via /auth/me
        me = s.get(f"{API}/auth/me", headers=_hdr(client_a["token"]), timeout=20).json()
        assert me["full_name"] == "TEST UserMgmt Updated"
        assert me["email"] == "updated@test.com"

    def test_upload_avatar_valid(self, s, client_a):
        # Tiny 1x1 transparent PNG base64
        tiny = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        r = s.post(f"{API}/users/upload/avatar", json={"image_base64": tiny},
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("avatar_url", "").startswith("data:image/")
        # Persisted
        me = s.get(f"{API}/auth/me", headers=_hdr(client_a["token"]), timeout=20).json()
        assert me["avatar_url"].startswith("data:image/")

    def test_upload_avatar_oversize(self, s, client_a):
        # >2.5MB string (~3MB)
        big = "data:image/jpeg;base64," + ("A" * 3_000_000)
        r = s.post(f"{API}/users/upload/avatar", json={"image_base64": big},
                   headers=_hdr(client_a["token"]), timeout=60)
        assert r.status_code == 400, r.text


# ---------------- Packs ----------------
class TestPacks:
    def test_list_packs(self, s):
        r = s.get(f"{API}/packs", timeout=20)
        assert r.status_code == 200
        packs = r.json()
        assert isinstance(packs, list)
        assert len(packs) == 4, f"Expected 4 packs got {len(packs)}"
        ids = {p["id"] for p in packs}
        assert ids == {"pack_5", "pack_20", "pack_50", "pack_100"}
        p20 = next(p for p in packs if p["id"] == "pack_20")
        assert p20.get("popular") is True
        assert p20["credits"] == 20
        assert p20["price"] == 299

    def test_buy_pack_20(self, s, client_a):
        # Confirm pre wallet >= 299 (welcome 500)
        me_pre = s.get(f"{API}/auth/me", headers=_hdr(client_a["token"]), timeout=20).json()
        pre_bal = me_pre["wallet_balance"]
        if pre_bal < 299:
            s.post(f"{API}/wallet/add", json={"amount": 500}, headers=_hdr(client_a["token"]))
            pre_bal = s.get(f"{API}/auth/me", headers=_hdr(client_a["token"])).json()["wallet_balance"]
        r = s.post(f"{API}/packs/buy", json={"pack_id": "pack_20"},
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        sub = r.json()
        assert sub["pack_id"] == "pack_20"
        assert sub["credits_total"] == 20
        assert sub["credits_remaining"] == 20
        assert sub["price"] == 299
        assert sub["status"] == "ACTIVE"

        # Wallet should be debited 299 (logged in transactions)
        wal = s.get(f"{API}/wallet", headers=_hdr(client_a["token"]), timeout=20).json()
        debits = [t for t in wal["transactions"]
                  if t.get("ref") == sub["id"] and t["amount"] == -299]
        assert len(debits) == 1, "Expected pack purchase debit txn of -299"

    def test_subscriptions_me(self, s, client_a):
        r = s.get(f"{API}/contact-subscriptions/me", headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["credits_available"] == 20
        assert len(j["subscriptions"]) >= 1
        assert j["subscriptions"][0]["pack_id"] == "pack_20"


# ---------------- Contact Unlocks ----------------
class TestUnlocks:
    def test_first_unlock_is_free(self, s, client_a, advisor_ids):
        r = s.post(f"{API}/advisors/{advisor_ids[0]}/unlock",
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("is_free") is True
        assert j["already_unlocked"] is False
        assert j.get("phone")
        # credits_available should still be 20 (free)
        subs = s.get(f"{API}/contact-subscriptions/me", headers=_hdr(client_a["token"])).json()
        assert subs["credits_available"] == 20

    def test_second_unlock_uses_credit(self, s, client_a, advisor_ids):
        r = s.post(f"{API}/advisors/{advisor_ids[1]}/unlock",
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("is_free") is False
        assert j["already_unlocked"] is False
        assert j.get("phone")
        # credits_available should drop to 19
        subs = s.get(f"{API}/contact-subscriptions/me", headers=_hdr(client_a["token"])).json()
        assert subs["credits_available"] == 19, f"Got {subs['credits_available']}"

    def test_repeat_unlock_already_unlocked(self, s, client_a, advisor_ids):
        r = s.post(f"{API}/advisors/{advisor_ids[1]}/unlock",
                   headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("already_unlocked") is True
        assert j.get("phone")
        # No additional credit consumed
        subs = s.get(f"{API}/contact-subscriptions/me", headers=_hdr(client_a["token"])).json()
        assert subs["credits_available"] == 19

    def test_unlocks_history(self, s, client_a):
        r = s.get(f"{API}/contact-unlocks/me", headers=_hdr(client_a["token"]), timeout=20)
        assert r.status_code == 200
        unlocks = r.json()
        assert isinstance(unlocks, list)
        assert len(unlocks) == 2  # 1 free + 1 paid
        is_free_flags = [u["is_free"] for u in unlocks]
        assert True in is_free_flags and False in is_free_flags

    def test_insufficient_credits_for_second_unlock(self, s, client_b, advisor_ids):
        """client_b: first unlock free, then second unlock with no pack → 400."""
        # First unlock = free
        r1 = s.post(f"{API}/advisors/{advisor_ids[0]}/unlock",
                    headers=_hdr(client_b["token"]), timeout=20)
        assert r1.status_code == 200, r1.text
        assert r1.json()["is_free"] is True
        # Second unlock without buying any pack → 400
        r2 = s.post(f"{API}/advisors/{advisor_ids[1]}/unlock",
                    headers=_hdr(client_b["token"]), timeout=20)
        assert r2.status_code == 400, r2.text
        assert "credit" in r2.text.lower() or "pack" in r2.text.lower()
