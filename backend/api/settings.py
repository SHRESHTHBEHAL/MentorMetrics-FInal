from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.config import Config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UserSettings(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    weekly_reports: Optional[bool] = None


class SettingsResponse(BaseModel):
    user_id: str
    display_name: Optional[str]
    notifications_enabled: bool
    weekly_reports: bool


@router.get("/{user_id}", response_model=SettingsResponse)
async def get_settings(user_id: str):
    """Get user settings."""
    try:
        supabase = Config.get_supabase_admin()
        result = (
            supabase.table("user_settings")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data and len(result.data) > 0:
            data = result.data[0]
            return SettingsResponse(
                user_id=data["user_id"],
                display_name=data.get("display_name"),
                notifications_enabled=data.get("notifications_enabled", True),
                weekly_reports=data.get("weekly_reports", False),
            )
        return SettingsResponse(
            user_id=user_id,
            display_name=None,
            notifications_enabled=True,
            weekly_reports=False,
        )
    except Exception as e:
        logger.error(f"Failed to get settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to load settings")


@router.put("/{user_id}", response_model=SettingsResponse)
async def update_settings(user_id: str, settings: UserSettings):
    """Update user settings."""
    try:
        supabase = Config.get_supabase_admin()
        update_data = {}
        if settings.display_name is not None:
            update_data["display_name"] = settings.display_name
        if settings.notifications_enabled is not None:
            update_data["notifications_enabled"] = settings.notifications_enabled
        if settings.weekly_reports is not None:
            update_data["weekly_reports"] = settings.weekly_reports

        if not update_data:
            raise HTTPException(status_code=400, detail="No settings to update")

        existing = (
            supabase.table("user_settings")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data and len(existing.data) > 0:
            result = (
                supabase.table("user_settings")
                .update(update_data)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            update_data["user_id"] = user_id
            result = (
                supabase.table("user_settings")
                .insert(update_data)
                .execute()
            )

        if result.data and len(result.data) > 0:
            data = result.data[0]
            return SettingsResponse(
                user_id=data["user_id"],
                display_name=data.get("display_name"),
                notifications_enabled=data.get("notifications_enabled", True),
                weekly_reports=data.get("weekly_reports", False),
            )
        raise HTTPException(status_code=500, detail="Failed to save settings")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")
