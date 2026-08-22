"""
Device Manager Pro — backend API.

FastAPI + MongoDB (Motor). All data is device-scoped via a client-generated
`device_id` (no login/auth, per PRD). Every response is plain JSON — no Mongo
`_id` ever leaks out, and every timestamp is a UTC ISO-8601 string.

Run locally:
    pip install -r requirements.txt --break-system-packages
    uvicorn server:app --reload --host 0.0.0.0 --port 8001
"""

import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("device-manager-pro")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "device_manager_pro")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Device Manager Pro API")
api = FastAPI(title="Device Manager Pro API (mounted under /api)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Strip Mongo's _id so nothing internal ever leaks to clients."""
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def device_scope(device_id_header: Optional[str], device_id_query: Optional[str]) -> str:
    device_id = device_id_header or device_id_query
    if not device_id:
        raise HTTPException(status_code=422, detail="device_id is required (header X-Device-Id or ?device_id=)")
    return device_id


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ScanIn(BaseModel):
    type: str
    health_score: Optional[int] = None
    freed_bytes: Optional[float] = None
    duplicate_count: Optional[int] = None
    photo_count: Optional[int] = None
    storage_used: Optional[float] = None
    storage_total: Optional[float] = None
    battery_level: Optional[float] = None
    junk_bytes: Optional[float] = None


class PrefsIn(BaseModel):
    premium: Optional[bool] = True
    autopilot: Optional[bool] = False
    schedule: Optional[str] = "weekly"
    notifications: Optional[bool] = True


class TrashItemIn(BaseModel):
    name: str
    kind: str = "file"
    size_bytes: float = 0
    thumb_uri: Optional[str] = None
    origin: Optional[str] = None
    device_id: Optional[str] = None  # per-item device_id is optional; header wins


class TrashIdsIn(BaseModel):
    ids: List[str]


class VaultItemIn(BaseModel):
    name: str
    kind: str = "file"
    size_bytes: float = 0
    thumb_uri: Optional[str] = None


# ---------------------------------------------------------------------------
# Scans / Dashboard / Stats
# ---------------------------------------------------------------------------

@api.post("/scans")
async def save_scan(
    payload: ScanIn,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    doc = payload.model_dump()
    doc.update({"id": new_id(), "device_id": did, "created_at": now_iso()})
    await db.scans.insert_one(doc)
    return clean(doc)


@api.get("/dashboard")
async def get_dashboard(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    last_scan = await db.scans.find_one({"device_id": did}, sort=[("created_at", -1)])

    predict_days = None
    if last_scan and last_scan.get("storage_total") and last_scan.get("storage_used"):
        free = last_scan["storage_total"] - last_scan["storage_used"]
        # crude linear estimate: assume ~1.2% of total fills up per day
        daily_fill = max(last_scan["storage_total"] * 0.012, 1)
        predict_days = max(1, round(free / daily_fill))

    score = last_scan.get("health_score") if last_scan else None
    tip = rule_based_tip(score, last_scan)

    return {
        "tip": tip,
        "predict_days_until_full": predict_days,
        "last_scan_at": last_scan.get("created_at") if last_scan else None,
    }


def rule_based_tip(score: Optional[int], last_scan: Optional[dict]) -> Dict[str, Any]:
    if score is not None and score < 55:
        return {
            "title": "Your device needs attention",
            "body": "Run a Clean Up to clear junk and duplicate photos — it's the fastest way to boost your score.",
            "icon": "sparkles",
            "ai": False,
        }
    if last_scan and (last_scan.get("duplicate_count") or 0) > 10:
        return {
            "title": "Lots of duplicate photos",
            "body": "You have quite a few duplicate photos. Clearing them is a quick, safe win.",
            "icon": "images",
            "ai": False,
        }
    return {
        "title": "Keep it up",
        "body": "Your device looks healthy. A weekly clean keeps it running smoothly.",
        "icon": "shield-checkmark",
        "ai": False,
    }


@api.get("/ai-tip")
async def get_ai_tip(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    """Personalized daily tip. Cached once per device per day.
    Tries the configured LLM if a key is present; always falls back to an
    honest rule-based tip if the LLM is unavailable, offline, or rate-limited.
    """
    did = device_scope(x_device_id, device_id)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    cached = await db.ai_tips.find_one({"device_id": did, "date": today})
    if cached:
        return clean(cached)["tip"]

    last_scan = await db.scans.find_one({"device_id": did}, sort=[("created_at", -1)])
    tip = rule_based_tip(last_scan.get("health_score") if last_scan else None, last_scan)

    if EMERGENT_LLM_KEY:
        try:
            import httpx

            prompt = (
                "You are a friendly phone-health assistant. In under 30 words, give one "
                f"honest, specific tip for a device with health score "
                f"{last_scan.get('health_score') if last_scan else 'unknown'}, "
                f"junk {last_scan.get('junk_bytes') if last_scan else 'unknown'} bytes, "
                f"and {last_scan.get('duplicate_count') if last_scan else 0} duplicate photos. "
                "No fake claims about RAM/CPU boosting."
            )
            async with httpx.AsyncClient(timeout=8) as http_client:
                resp = await http_client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {EMERGENT_LLM_KEY}"},
                    json={
                        "model": "gpt-5.4-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 80,
                    },
                )
                if resp.status_code == 200:
                    text = resp.json()["choices"][0]["message"]["content"].strip()
                    tip = {"title": "Your daily tip", "body": text, "icon": "bulb", "ai": True}
        except Exception as e:  # noqa: BLE001 — any LLM failure must not break the app
            logger.info("ai-tip LLM call failed, using rule-based fallback: %s", e)

    await db.ai_tips.update_one(
        {"device_id": did, "date": today},
        {"$set": {"device_id": did, "date": today, "tip": tip, "created_at": now_iso()}},
        upsert=True,
    )
    return tip


@api.get("/stats")
async def get_stats(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    cursor = db.scans.find({"device_id": did, "freed_bytes": {"$gt": 0}})
    total = 0.0
    async for doc in cursor:
        total += doc.get("freed_bytes") or 0
    return {"total_freed": total}


# ---------------------------------------------------------------------------
# Prefs
# ---------------------------------------------------------------------------

@api.get("/prefs")
async def get_prefs(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    doc = await db.prefs.find_one({"device_id": did})
    if not doc:
        doc = {"device_id": did, "premium": True, "autopilot": False, "schedule": "weekly", "notifications": True}
    return clean(doc)


@api.post("/prefs")
async def update_prefs(
    payload: PrefsIn,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    patch["updated_at"] = now_iso()
    await db.prefs.update_one({"device_id": did}, {"$set": {**patch, "device_id": did}}, upsert=True)
    doc = await db.prefs.find_one({"device_id": did})
    return clean(doc)


# ---------------------------------------------------------------------------
# Trash
# ---------------------------------------------------------------------------

@api.post("/trash")
async def add_trash(
    items: List[TrashItemIn],
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    # Header/query device_id is used whenever an item omits its own —
    # this is the exact 422 regression called out in the PRD/audit.
    fallback_did = x_device_id or device_id
    created = []
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    for item in items:
        did = item.device_id or fallback_did
        if not did:
            raise HTTPException(status_code=422, detail="device_id missing on item and no X-Device-Id header/query provided")
        doc = item.model_dump()
        doc.update({"id": new_id(), "device_id": did, "created_at": now_iso(), "expires_at": expires})
        await db.trash.insert_one(doc)
        created.append(clean(doc))
    return created


@api.get("/trash")
async def list_trash(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    await purge_expired_trash(did)
    cursor = db.trash.find({"device_id": did}).sort("created_at", -1)
    return [clean(doc) async for doc in cursor]


@api.post("/trash/restore")
async def restore_trash(
    payload: TrashIdsIn,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    result = await db.trash.delete_many({"device_id": did, "id": {"$in": payload.ids}})
    return {"restored": result.deleted_count}


@api.post("/trash/delete")
async def delete_trash(
    payload: TrashIdsIn,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    result = await db.trash.delete_many({"device_id": did, "id": {"$in": payload.ids}})
    return {"deleted": result.deleted_count}


async def purge_expired_trash(device_id: str) -> None:
    await db.trash.delete_many({"device_id": device_id, "expires_at": {"$lt": now_iso()}})


# ---------------------------------------------------------------------------
# Vault
# ---------------------------------------------------------------------------

@api.get("/vault")
async def list_vault(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    cursor = db.vault.find({"device_id": did}).sort("created_at", -1)
    return [clean(doc) async for doc in cursor]


@api.post("/vault")
async def add_vault(
    payload: VaultItemIn,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    doc = payload.model_dump()
    doc.update({"id": new_id(), "device_id": did, "created_at": now_iso()})
    await db.vault.insert_one(doc)
    return clean(doc)


@api.delete("/vault/{item_id}")
async def remove_vault(
    item_id: str,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    device_id: Optional[str] = Query(default=None),
):
    did = device_scope(x_device_id, device_id)
    result = await db.vault.delete_one({"device_id": did, "id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="vault item not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Health check + mount
# ---------------------------------------------------------------------------

@api.get("/")
async def api_root():
    return {"status": "ok", "service": "device-manager-pro-api"}


app.mount("/api", api)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
