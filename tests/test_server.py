"""
Backend test suite for Device Manager Pro.

Run from the `backend/` directory (or with PYTHONPATH pointing at it):
    cd backend && pip install -r requirements.txt --break-system-packages
    cd .. && pytest tests/ -v

Uses httpx's ASGI transport against the real FastAPI app, and a disposable
MongoDB test database (set MONGO_URL / DB_NAME via backend/.env or env vars
before running — a local `mongod` on localhost:27017 is enough).
"""
import os
import sys
import uuid
import asyncio
import pytest
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.environ.setdefault("DB_NAME", "device_manager_pro_test")

from server import app  # noqa: E402


@pytest.fixture
def device_id():
    return f"test-{uuid.uuid4().hex[:8]}"


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_root(client):
    r = await client.get("/api/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_save_scan_and_no_leaked_id(client, device_id):
    r = await client.post(
        "/api/scans",
        json={"type": "quick", "health_score": 82, "storage_used": 10, "storage_total": 100},
        headers={"X-Device-Id": device_id},
    )
    assert r.status_code == 200
    body = r.json()
    assert "_id" not in body
    assert body["device_id"] == device_id
    assert "created_at" in body


@pytest.mark.asyncio
async def test_scan_requires_device_id(client):
    r = await client.post("/api/scans", json={"type": "quick"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_dashboard_returns_tip_and_prediction(client, device_id):
    await client.post(
        "/api/scans",
        json={"type": "quick", "health_score": 40, "storage_used": 90, "storage_total": 100},
        headers={"X-Device-Id": device_id},
    )
    r = await client.get("/api/dashboard", headers={"X-Device-Id": device_id})
    assert r.status_code == 200
    body = r.json()
    assert "tip" in body and body["tip"]["title"]
    assert body["predict_days_until_full"] is not None


@pytest.mark.asyncio
async def test_ai_tip_fallback_without_key(client, device_id, monkeypatch):
    import server
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "")
    r = await client.get("/api/ai-tip", headers={"X-Device-Id": device_id})
    assert r.status_code == 200
    body = r.json()
    assert body["ai"] is False
    assert body["title"]


@pytest.mark.asyncio
async def test_ai_tip_is_cached_per_day(client, device_id, monkeypatch):
    import server
    monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "")
    r1 = await client.get("/api/ai-tip", headers={"X-Device-Id": device_id})
    r2 = await client.get("/api/ai-tip", headers={"X-Device-Id": device_id})
    assert r1.json() == r2.json()


@pytest.mark.asyncio
async def test_trash_item_without_per_item_device_id_uses_header(client, device_id):
    """Regression test for the documented bug: POST /api/trash 422s when an
    item omits its own device_id — it must fall back to the header/query."""
    r = await client.post(
        "/api/trash",
        json=[{"name": "photo.jpg", "kind": "photo", "size_bytes": 1024}],
        headers={"X-Device-Id": device_id},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["device_id"] == device_id
    assert "expires_at" in body[0]


@pytest.mark.asyncio
async def test_trash_without_device_id_anywhere_fails(client):
    r = await client.post(
        "/api/trash",
        json=[{"name": "photo.jpg", "kind": "photo", "size_bytes": 1024}],
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_trash_list_restore_delete_flow(client, device_id):
    add = await client.post(
        "/api/trash",
        json=[
            {"name": "a.jpg", "kind": "photo", "size_bytes": 100},
            {"name": "b.jpg", "kind": "photo", "size_bytes": 200},
        ],
        headers={"X-Device-Id": device_id},
    )
    ids = [it["id"] for it in add.json()]

    listed = await client.get("/api/trash", headers={"X-Device-Id": device_id})
    assert len(listed.json()) == 2

    restored = await client.post("/api/trash/restore", json={"ids": [ids[0]]}, headers={"X-Device-Id": device_id})
    assert restored.json()["restored"] == 1

    after = await client.get("/api/trash", headers={"X-Device-Id": device_id})
    assert len(after.json()) == 1

    deleted = await client.post("/api/trash/delete", json={"ids": [ids[1]]}, headers={"X-Device-Id": device_id})
    assert deleted.json()["deleted"] == 1

    final = await client.get("/api/trash", headers={"X-Device-Id": device_id})
    assert len(final.json()) == 0


@pytest.mark.asyncio
async def test_vault_add_list_remove(client, device_id):
    created = await client.post(
        "/api/vault",
        json={"name": "secret.pdf", "kind": "file", "size_bytes": 500},
        headers={"X-Device-Id": device_id},
    )
    assert created.status_code == 200
    item_id = created.json()["id"]

    listed = await client.get("/api/vault", headers={"X-Device-Id": device_id})
    assert any(i["id"] == item_id for i in listed.json())

    removed = await client.delete(f"/api/vault/{item_id}", headers={"X-Device-Id": device_id})
    assert removed.status_code == 200

    missing = await client.delete(f"/api/vault/{item_id}", headers={"X-Device-Id": device_id})
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_prefs_defaults_then_update(client, device_id):
    r = await client.get("/api/prefs", headers={"X-Device-Id": device_id})
    assert r.status_code == 200
    assert r.json()["premium"] is True

    updated = await client.post(
        "/api/prefs",
        json={"autopilot": True, "schedule": "daily"},
        headers={"X-Device-Id": device_id},
    )
    assert updated.json()["autopilot"] is True
    assert updated.json()["schedule"] == "daily"


@pytest.mark.asyncio
async def test_stats_sums_freed_bytes(client, device_id):
    await client.post(
        "/api/scans",
        json={"type": "clean", "freed_bytes": 1000},
        headers={"X-Device-Id": device_id},
    )
    await client.post(
        "/api/scans",
        json={"type": "clean", "freed_bytes": 500},
        headers={"X-Device-Id": device_id},
    )
    r = await client.get("/api/stats", headers={"X-Device-Id": device_id})
    assert r.json()["total_freed"] == 1500
