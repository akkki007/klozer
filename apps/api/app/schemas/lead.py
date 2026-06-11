import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.lead import LeadCategory, LeadSourceType


class LeadCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    source_type: LeadSourceType = LeadSourceType.manual


class LeadUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    category: LeadCategory | None = None
    status: str | None = None


class LeadOut(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    status: str
    category: LeadCategory
    owner_id: uuid.UUID | None
    created_at: datetime
    last_engaged_at: datetime | None

    model_config = {"from_attributes": True}


class LeadAssignRequest(BaseModel):
    owner_id: uuid.UUID


class ActivityCreate(BaseModel):
    lead_id: uuid.UUID
    type: str
    outcome: str | None = None
    duration_sec: int | None = None
    body: str | None = None
    meta_json: dict | None = None


class TaskCreate(BaseModel):
    lead_id: uuid.UUID
    title: str
    due_at: datetime | None = None
