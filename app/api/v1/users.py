import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.services import user_service

router = APIRouter()


def _discord_configured():
    from app.core.config import settings

    return bool(settings.DISCORD_CLIENT_ID and settings.DISCORD_CLIENT_SECRET)


@router.get("/auth/discord", include_in_schema=False)
def discord_login():
    from app.core.config import settings

    if not _discord_configured():
        return RedirectResponse(f"{settings.FRONTEND_URL}/#auth_error=discord_unavailable")
    state = secrets.token_urlsafe(32)
    query = urlencode({
        "client_id": settings.DISCORD_CLIENT_ID,
        "redirect_uri": settings.DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify email",
        "state": state,
        "prompt": "consent",
    })
    response = RedirectResponse(f"https://discord.com/oauth2/authorize?{query}")
    response.set_cookie(
        "discord_oauth_state", state, httponly=True,
        secure=settings.DISCORD_REDIRECT_URI.startswith("https://"),
        samesite="lax", max_age=600, path="/auth/discord/callback",
    )
    return response


@router.get("/auth/discord/callback", include_in_schema=False)
def discord_callback(request: Request, code: str = "", state: str = "", error: str = "", db: Session = Depends(get_db)):
    from app.core.config import settings

    frontend = settings.FRONTEND_URL
    response = RedirectResponse(f"{frontend}/#auth_error=discord_failed")
    cookie_state = request.cookies.get("discord_oauth_state", "")
    response.delete_cookie("discord_oauth_state", path="/auth/discord/callback")
    if error or not code or not state or not cookie_state or not secrets.compare_digest(state, cookie_state):
        return response

    try:
        token_response = httpx.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": settings.DISCORD_CLIENT_ID,
                "client_secret": settings.DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.DISCORD_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        token_response.raise_for_status()
        discord_access_token = token_response.json()["access_token"]
        profile_response = httpx.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {discord_access_token}"},
            timeout=10,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()
        email = profile.get("email")
        if not email or not profile.get("verified") or not profile.get("id"):
            return response
        user = user_service.create_or_link_discord_user(
            db, str(profile["id"]), email, profile.get("global_name") or profile.get("username") or "discord_user"
        )
        token = create_access_token(data={"sub": user.username})
        response = RedirectResponse(f"{frontend}/#access_token={token}")
        response.delete_cookie("discord_oauth_state", path="/auth/discord/callback")
        return response
    except (httpx.HTTPError, KeyError, ValueError):
        return response

@router.post(
    "/users",
    response_model=UserResponse,
    status_code=201,
    summary="Criar um novo usuário",
    description="Permite criar um novo usuário no banco de dados."
)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(
        db=db,
        user=user
    )

@router.post(
    "/login",
    response_model=Token,
    summary="Realizar login",
    description="Autentica um usuário e retorna um token JWT."
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    authenticated_user = user_service.authenticate_user(
        db=db,
        identifier=user.identifier,
        password=user.password
    )

    if not authenticated_user:
        raise HTTPException(
            status_code=401,
            detail="Usuário ou senha inválidos."
        )
    access_token = create_access_token(
    data={
        "sub": authenticated_user.username
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
