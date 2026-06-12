"""End-to-end tests for the hierarchy / user-management feature."""
from tests.conftest import signup, auth_header


# ── Signup / roles ────────────────────────────────────────────────────────────
async def test_signup_creates_company_admin(client):
    data = await signup(client)
    assert data["role"] == "company_admin"
    assert data["must_change_password"] is False


# ── Provisioning + credentials ────────────────────────────────────────────────
async def test_admin_creates_head_and_employee(client):
    admin = await signup(client)
    token = admin["access_token"]

    res = await client.post(
        "/api/users/heads",
        headers=auth_header(token),
        json={"full_name": "Henry Head", "email": "henry@acme.com", "department": "Sales"},
    )
    assert res.status_code == 201, res.text
    head = res.json()
    assert head["employee_code"]
    assert head["temp_password"]
    assert head["email_sent"] is False  # SMTP unconfigured in tests

    res = await client.post(
        "/api/users/employees",
        headers=auth_header(token),
        json={"full_name": "Eve Emp", "email": "eve@acme.com", "manager_id": head["user_id"]},
    )
    assert res.status_code == 201, res.text
    emp = res.json()
    assert emp["employee_code"] != head["employee_code"]


async def test_head_creates_employee_but_not_head(client):
    admin = await signup(client)
    atoken = admin["access_token"]
    head_creds = (
        await client.post(
            "/api/users/heads",
            headers=auth_header(atoken),
            json={"full_name": "Henry Head", "email": "henry2@acme.com"},
        )
    ).json()

    # Head logs in with the temp password and must change it first.
    login = await client.post(
        "/api/auth/login",
        json={"identifier": head_creds["email"], "password": head_creds["temp_password"]},
    )
    assert login.status_code == 200
    assert login.json()["must_change_password"] is True
    htoken = login.json()["access_token"]

    # Forced password change blocks user creation until cleared.
    blocked = await client.post(
        "/api/users/employees",
        headers=auth_header(htoken),
        json={"full_name": "X", "email": "x@acme.com"},
    )
    assert blocked.status_code == 403

    # Change password, then retry.
    changed = await client.post(
        "/api/auth/change-password",
        headers=auth_header(htoken),
        json={"current_password": head_creds["temp_password"], "new_password": "NewPassw0rd!"},
    )
    assert changed.status_code == 200
    htoken = changed.json()["access_token"]
    assert changed.json()["must_change_password"] is False

    # Head can create an employee...
    ok = await client.post(
        "/api/users/employees",
        headers=auth_header(htoken),
        json={"full_name": "Em Ployee", "email": "emp@acme.com"},
    )
    assert ok.status_code == 201

    # ...but NOT a head.
    denied = await client.post(
        "/api/users/heads",
        headers=auth_header(htoken),
        json={"full_name": "Nope", "email": "nope@acme.com"},
    )
    assert denied.status_code == 403


async def test_employee_cannot_create_users(client):
    admin = await signup(client)
    atoken = admin["access_token"]
    emp_creds = (
        await client.post(
            "/api/users/employees",
            headers=auth_header(atoken),
            json={"full_name": "Solo Emp", "email": "solo@acme.com"},
        )
    ).json()
    login = await client.post(
        "/api/auth/login",
        json={"identifier": emp_creds["email"], "password": emp_creds["temp_password"]},
    )
    etoken = login.json()["access_token"]
    # Change password to clear the gate.
    changed = await client.post(
        "/api/auth/change-password",
        headers=auth_header(etoken),
        json={"current_password": emp_creds["temp_password"], "new_password": "EmpPassw0rd!"},
    )
    etoken = changed.json()["access_token"]

    res = await client.post(
        "/api/users/employees",
        headers=auth_header(etoken),
        json={"full_name": "Y", "email": "y@acme.com"},
    )
    assert res.status_code == 403


# ── Tenant isolation ──────────────────────────────────────────────────────────
async def test_tenant_isolation(client):
    a = await signup(client, org="CompanyA", email="a@a.com")
    b = await signup(client, org="CompanyB", email="b@b.com")

    await client.post(
        "/api/users/heads",
        headers=auth_header(a["access_token"]),
        json={"full_name": "A Head", "email": "ahead@a.com"},
    )

    a_list = (await client.get("/api/users", headers=auth_header(a["access_token"]))).json()
    b_list = (await client.get("/api/users", headers=auth_header(b["access_token"]))).json()

    a_emails = {u["email"] for u in a_list}
    b_emails = {u["email"] for u in b_list}
    assert "ahead@a.com" in a_emails
    assert "ahead@a.com" not in b_emails  # B cannot see A's users


# ── Employee code uniqueness ──────────────────────────────────────────────────
async def test_employee_code_uniqueness(client):
    admin = await signup(client)
    token = admin["access_token"]
    codes = set()
    for i in range(5):
        res = await client.post(
            "/api/users/employees",
            headers=auth_header(token),
            json={"full_name": f"User {i}", "email": f"u{i}@acme.com"},
        )
        assert res.status_code == 201, res.text
        codes.add(res.json()["employee_code"])
    assert len(codes) == 5  # all distinct


# ── Lead visibility per role ──────────────────────────────────────────────────
async def test_lead_visibility(client):
    admin = await signup(client)
    atoken = admin["access_token"]

    # Two employees.
    e1 = (
        await client.post(
            "/api/users/employees",
            headers=auth_header(atoken),
            json={"full_name": "Emp One", "email": "e1@acme.com"},
        )
    ).json()
    e2 = (
        await client.post(
            "/api/users/employees",
            headers=auth_header(atoken),
            json={"full_name": "Emp Two", "email": "e2@acme.com"},
        )
    ).json()

    def tok_for(creds, newpw):
        return creds, newpw

    async def login_and_clear(creds, newpw):
        login = await client.post(
            "/api/auth/login",
            json={"identifier": creds["email"], "password": creds["temp_password"]},
        )
        t = login.json()["access_token"]
        ch = await client.post(
            "/api/auth/change-password",
            headers=auth_header(t),
            json={"current_password": creds["temp_password"], "new_password": newpw},
        )
        return ch.json()["access_token"]

    e1tok = await login_and_clear(e1, "E1passw0rd!")
    e2tok = await login_and_clear(e2, "E2passw0rd!")

    # Each employee creates a lead (owned by them via assign).
    lead1 = (await client.post("/api/leads", headers=auth_header(e1tok), json={"name": "Lead A"})).json()
    # Admin assigns lead1 to e1 explicitly.
    await client.post(
        f"/api/leads/{lead1['id']}/assign",
        headers=auth_header(atoken),
        json={"owner_id": e1["user_id"]},
    )
    lead2 = (await client.post("/api/leads", headers=auth_header(e2tok), json={"name": "Lead B"})).json()
    await client.post(
        f"/api/leads/{lead2['id']}/assign",
        headers=auth_header(atoken),
        json={"owner_id": e2["user_id"]},
    )

    # e1 sees only their lead; admin sees both.
    e1_leads = (await client.get("/api/leads", headers=auth_header(e1tok))).json()
    e1_ids = {l["id"] for l in e1_leads}
    assert lead1["id"] in e1_ids
    assert lead2["id"] not in e1_ids

    admin_leads = (await client.get("/api/leads", headers=auth_header(atoken))).json()
    admin_ids = {l["id"] for l in admin_leads}
    assert {lead1["id"], lead2["id"]} <= admin_ids


# ── Audit trail ───────────────────────────────────────────────────────────────
async def test_audit_log_written(client):
    admin = await signup(client)
    token = admin["access_token"]
    await client.post(
        "/api/users/heads",
        headers=auth_header(token),
        json={"full_name": "Audited Head", "email": "audited@acme.com"},
    )
    logs = (await client.get("/api/audit", headers=auth_header(token))).json()
    actions = {l["action"] for l in logs}
    assert "user_created" in actions
