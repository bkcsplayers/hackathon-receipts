import pytest


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    response = await client.post("/api/upload/")
    assert response.status_code == 401
