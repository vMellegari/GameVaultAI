"""Add game type to distinguish ongoing experiences.

Revision ID: 7c31a6d2f4b8
Revises: 1ffec320bac4
Create Date: 2026-09-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7c31a6d2f4b8"
down_revision: Union[str, Sequence[str], None] = "1ffec320bac4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    game_type_enum = postgresql.ENUM(
        "STANDARD",
        "ONGOING",
        name="gametype",
    )
    game_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "games",
        sa.Column(
            "game_type",
            game_type_enum,
            server_default=sa.text("'STANDARD'"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_games_ongoing_not_completed",
        "games",
        "game_type != 'ONGOING' OR status != 'COMPLETED'",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_games_ongoing_not_completed",
        "games",
        type_="check",
    )
    op.drop_column("games", "game_type")
    postgresql.ENUM(name="gametype").drop(op.get_bind(), checkfirst=True)
