from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.game import Game
from app.models.game_session import GameSession
from app.models.game_session_image import GameSessionImage
from app.models.user import User

MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_IMAGES_PER_SESSION = 5

_IMAGE_FORMATS = {
    "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/webp": (
        ".webp",
        lambda data: len(data) >= 12
        and data.startswith(b"RIFF")
        and data[8:12] == b"WEBP",
    ),
}


class SessionImageError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def get_owned_session(
    db: Session,
    game_id: int,
    session_id: int,
    owner: User,
) -> GameSession | None:
    return (
        db.query(GameSession)
        .join(Game, Game.id == GameSession.game_id)
        .filter(
            GameSession.id == session_id,
            GameSession.game_id == game_id,
            Game.owner_id == owner.id,
        )
        .first()
    )


def _media_directory() -> Path:
    directory = Path(settings.MEDIA_DIR)
    if not directory.is_absolute():
        directory = Path.cwd() / directory
    return directory.resolve() / "session-images"


def image_file_path(image: GameSessionImage) -> Path:
    extension = _IMAGE_FORMATS.get(image.content_type, ("", None))[0]
    return _media_directory() / f"{image.storage_key}{extension}"


def _is_supabase_storage() -> bool:
    return settings.STORAGE_BACKEND == "supabase"


def uses_remote_storage() -> bool:
    return _is_supabase_storage()


def _supabase_object_path(image: GameSessionImage) -> str:
    extension = _IMAGE_FORMATS.get(image.content_type, ("", None))[0]
    return f"session-images/{image.storage_key}{extension}"


def _supabase_headers(content_type: str | None = None) -> dict[str, str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SessionImageError(
            503,
            "O armazenamento de imagens não está configurado corretamente.",
        )
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _supabase_object_url(object_path: str) -> str:
    return (
        f"{settings.SUPABASE_URL}/storage/v1/object/"
        f"{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
    )


def store_session_images(
    db: Session,
    session: GameSession,
    uploads: list[tuple[str, bytes]],
) -> list[GameSessionImage]:
    if not uploads:
        raise SessionImageError(400, "Selecione pelo menos uma imagem.")

    current_count = db.query(GameSessionImage).filter(
        GameSessionImage.session_id == session.id
    ).count()
    if len(uploads) + current_count > MAX_IMAGES_PER_SESSION:
        raise SessionImageError(
            400,
            f"Cada sessão pode ter no máximo {MAX_IMAGES_PER_SESSION} imagens.",
        )

    validated_uploads = []
    for original_filename, data in uploads:
        if len(data) > MAX_IMAGE_SIZE:
            raise SessionImageError(413, "Cada imagem deve ter no máximo 5 MB.")

        image_format = next(
            (
                (content_type, extension)
                for content_type, (extension, matches) in _IMAGE_FORMATS.items()
                if matches(data)
            ),
            None,
        )
        if image_format is None:
            raise SessionImageError(
                415,
                "Formato não permitido. Envie uma imagem JPEG, PNG ou WebP.",
            )

        content_type, extension = image_format
        safe_filename = Path(original_filename.replace("\\", "/")).name
        safe_filename = safe_filename[:255] or f"screenshot{extension}"
        validated_uploads.append((safe_filename, data, content_type, extension))

    directory = _media_directory()
    if not _is_supabase_storage():
        directory.mkdir(parents=True, exist_ok=True)
    created_objects: list[tuple[str, str]] = []
    images = []

    try:
        for filename, data, content_type, extension in validated_uploads:
            storage_key = str(uuid4())
            image = GameSessionImage(
                session_id=session.id,
                storage_key=storage_key,
                original_filename=filename,
                content_type=content_type,
                file_size=len(data),
            )
            if _is_supabase_storage():
                object_path = _supabase_object_path(image)
                try:
                    response = httpx.post(
                        _supabase_object_url(object_path),
                        headers={
                            **_supabase_headers(content_type),
                            "x-upsert": "false",
                        },
                        content=data,
                        timeout=30,
                    )
                except httpx.HTTPError as error:
                    raise SessionImageError(
                        502, "Não foi possível conectar ao armazenamento de imagens."
                    ) from error
                if response.is_error:
                    raise SessionImageError(
                        502, "Não foi possível armazenar a imagem no Supabase."
                    )
                created_objects.append((storage_key, content_type))
            else:
                path = directory / f"{storage_key}{extension}"
                path.write_bytes(data)
                created_objects.append((storage_key, content_type))
            images.append(image)

        db.add_all(images)
        db.commit()
    except Exception:
        db.rollback()
        remove_files(created_objects)
        raise

    for image in images:
        db.refresh(image)
    return images


def get_owned_image(
    db: Session,
    game_id: int,
    session_id: int,
    image_id: int,
    owner: User,
) -> GameSessionImage | None:
    return (
        db.query(GameSessionImage)
        .join(GameSession, GameSession.id == GameSessionImage.session_id)
        .join(Game, Game.id == GameSession.game_id)
        .filter(
            GameSessionImage.id == image_id,
            GameSession.id == session_id,
            GameSession.game_id == game_id,
            Game.owner_id == owner.id,
        )
        .first()
    )


def delete_image(db: Session, image: GameSessionImage) -> None:
    storage_object = (image.storage_key, image.content_type)
    db.delete(image)
    db.commit()
    remove_files([storage_object])


def get_game_image_paths(db: Session, game_id: int) -> list[tuple[str, str]]:
    images = (
        db.query(GameSessionImage)
        .join(GameSession, GameSession.id == GameSessionImage.session_id)
        .filter(GameSession.game_id == game_id)
        .all()
    )
    return [(image.storage_key, image.content_type) for image in images]


def get_image_bytes(image: GameSessionImage) -> bytes:
    if _is_supabase_storage():
        try:
            response = httpx.get(
                _supabase_object_url(_supabase_object_path(image)),
                headers=_supabase_headers(),
                timeout=30,
            )
            response.raise_for_status()
            return response.content
        except httpx.HTTPStatusError as error:
            status_code = 404 if error.response.status_code == 404 else 502
            raise SessionImageError(
                status_code,
                "Arquivo de imagem não encontrado no armazenamento."
                if status_code == 404
                else "Não foi possível obter a imagem do armazenamento.",
            ) from error
        except httpx.HTTPError as error:
            raise SessionImageError(
                502, "Não foi possível conectar ao armazenamento de imagens."
            ) from error
    path = image_file_path(image)
    if not path.is_file():
        raise SessionImageError(404, "Arquivo de imagem não encontrado.")
    return path.read_bytes()


def remove_files(objects: list[tuple[str, str] | Path]) -> None:
    for stored_object in objects:
        try:
            if isinstance(stored_object, Path):
                stored_object.unlink(missing_ok=True)
            elif _is_supabase_storage():
                storage_key, content_type = stored_object
                image = GameSessionImage(
                    storage_key=storage_key,
                    content_type=content_type,
                )
                object_path = _supabase_object_path(image)
                response = httpx.delete(
                    f"{settings.SUPABASE_URL}/storage/v1/object/"
                    f"{settings.SUPABASE_STORAGE_BUCKET}",
                    headers=_supabase_headers(),
                    json={"prefixes": [object_path]},
                    timeout=30,
                )
                response.raise_for_status()
            else:
                storage_key, content_type = stored_object
                image = GameSessionImage(
                    storage_key=storage_key,
                    content_type=content_type,
                )
                image_file_path(image).unlink(missing_ok=True)
        except (OSError, httpx.HTTPError, SessionImageError):
            # A cleanup failure must not undo a successful database deletion.
            continue
