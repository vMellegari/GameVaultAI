from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.services import user_service

router = APIRouter()

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
        username=user.username,
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