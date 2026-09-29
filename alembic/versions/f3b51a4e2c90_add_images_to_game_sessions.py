"""Add image metadata for game session attachments.

Revision ID: f3b51a4e2c90
Revises: f19a40d2c6b1
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3b51a4e2c90"
down_revision: Union[str, Sequence[str], None] = "f19a40d2c6b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_session_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=36), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["game_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(
        op.f("ix_game_session_images_id"),
        "game_session_images",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_game_session_images_session_id"),
        "game_session_images",
        ["session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_game_session_images_session_id"),
        table_name="game_session_images",
    )
    op.drop_index(
        op.f("ix_game_session_images_id"),
        table_name="game_session_images",
    )
    op.drop_table("game_session_images")
