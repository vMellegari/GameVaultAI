from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
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