"""add Discord OAuth identity

Revision ID: d31e7b4a9c20
Revises: 1ffec320bac4
Create Date: 2026-11-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d31e7b4a9c20"
down_revision: Union[str, Sequence[str], None] = "f3b51a4e2c90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("password_hash", existing_type=sa.String(), nullable=True)
        batch_op.add_column(sa.Column("discord_id", sa.String(), nullable=True))
        batch_op.create_index("ix_users_discord_id", ["discord_id"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_discord_id")
        batch_op.drop_column("discord_id")
        batch_op.alter_column("password_hash", existing_type=sa.String(), nullable=False)
