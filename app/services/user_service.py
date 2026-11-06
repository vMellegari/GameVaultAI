from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def authenticate_user(
    db: Session,
    identifier: str,
    password: str
):
    normalized_identifier = identifier.strip()
    user = get_user_by_username(db, normalized_identifier)
    if user is None:
        user = get_user_by_email(db, normalized_identifier.lower())

    if not user or not user.password_hash:
        return None

    if not verify_password(
        plain_password=password,
        hashed_password=user.password_hash
    ):
        return None

    return user


def create_or_link_discord_user(db: Session, discord_id: str, email: str, display_name: str):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if user:
        return user

    normalized_email = email.strip().lower()
    user = get_user_by_email(db, normalized_email)
    if user:
        if user.discord_id and user.discord_id != discord_id:
            raise ValueError("This email is already linked to another Discord account.")
        user.discord_id = discord_id
        db.commit()
        db.refresh(user)
        return user

    base_username = "".join(
        character.lower() if character.isalnum() or character in "_-" else "_"
        for character in display_name.strip()
    ).strip("_-")[:24] or "discord_user"
    username = base_username
    suffix = 1
    while get_user_by_username(db, username):
        username = f"{base_username[:24 - len(str(suffix)) - 1]}_{suffix}"
        suffix += 1

    user = User(
        username=username,
        email=normalized_email,
        password_hash=None,
        discord_id=discord_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

def create_user(db: Session, user: UserCreate):
    existing_username = get_user_by_username(db, user.username)

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nome de usuário já está em uso."
        )

    existing_email = get_user_by_email(db, user.email)

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado."
        )

    db_user = User(
        username=user.username,
        email=str(user.email).strip().lower(),
        password_hash=hash_password(user.password)
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
