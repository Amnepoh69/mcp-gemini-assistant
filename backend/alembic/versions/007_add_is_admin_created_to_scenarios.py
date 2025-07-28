"""add_is_admin_created_to_scenarios

Revision ID: 007
Revises: 006
Create Date: 2025-07-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    """Add is_admin_created column to scenarios table."""
    op.add_column('scenarios', sa.Column('is_admin_created', sa.Boolean(), nullable=False, default=False))


def downgrade():
    """Remove is_admin_created column from scenarios table."""
    op.drop_column('scenarios', 'is_admin_created')