"""add the text-to-speech router type

Revision ID: c7d3a5e91b42
Revises: bf92da1a3246
Create Date: 2026-10-25 09:00:00.000000

Nexora: a router of type `text-to-speech` serves `POST /v1/audio/speech`. PostgreSQL cannot remove
an enum member, so the downgrade leaves it in place (no row can use it once the code is older).
"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7d3a5e91b42"
down_revision: str | None = "bf92da1a3246"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE routertype ADD VALUE IF NOT EXISTS 'TEXT_TO_SPEECH'")


def downgrade() -> None:
    op.execute("DELETE FROM provider WHERE router_id IN (SELECT id FROM router WHERE type = 'TEXT_TO_SPEECH')")
    op.execute("DELETE FROM router WHERE type = 'TEXT_TO_SPEECH'")
