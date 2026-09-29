"""Add game session history.

Revision ID: f19a40d2c6b1
Revises: 7c31a6d2f4b8
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f19a40d2c6b1"
down_revision: Union[str, Sequence[str], None] = "7c31a6d2f4b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("notes", sa.String(length=2000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "duration_minutes > 0",
            name="ck_game_sessions_duration_positive",
        ),
        sa.ForeignKeyConstraint(
            ["game_id"],
            ["games.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_game_sessions_game_id"),
        "game_sessions",
        ["game_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_game_sessions_id"),
        "game_sessions",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_game_sessions_id"), table_name="game_sessions")
    op.drop_index(op.f("ix_game_sessions_game_id"), table_name="game_sessions")
    op.drop_table("game_sessions")
