from pathlib import Path
from uuid import uuid4

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
    directory.mkdir(parents=True, exist_ok=True)
    created_paths: list[Path] = []
    images = []

    try:
        for filename, data, content_type, extension in validated_uploads:
            storage_key = str(uuid4())
            path = directory / f"{storage_key}{extension}"
            created_paths.append(path)
            path.write_bytes(data)
            images.append(
                GameSessionImage(
                    session_id=session.id,
                    storage_key=storage_key,
                    original_filename=filename,
                    content_type=content_type,
                    file_size=len(data),
                )
            )

        db.add_all(images)
        db.commit()
    except Exception:
        db.rollback()
        remove_files(created_paths)
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
    path = image_file_path(image)
    db.delete(image)
    db.commit()
    remove_files([path])


def get_game_image_paths(db: Session, game_id: int) -> list[Path]:
    images = (
        db.query(GameSessionImage)
        .join(GameSession, GameSession.id == GameSessionImage.session_id)
        .filter(GameSession.game_id == game_id)
        .all()
    )
    return [image_file_path(image) for image in images]


def remove_files(paths: list[Path]) -> None:
    for path in paths:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            # A cleanup failure must not undo a successful database deletion.
            continue
