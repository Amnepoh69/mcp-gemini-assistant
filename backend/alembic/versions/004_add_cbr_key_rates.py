"""Add CBR key rates table

Revision ID: 004
Revises: 003
Create Date: 2025-01-16 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create CBR key rates table
    op.create_table(
        'cbr_key_rates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('rate', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_cbr_key_rates_id', 'cbr_key_rates', ['id'])
    op.create_index('ix_cbr_key_rates_date', 'cbr_key_rates', ['date'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_cbr_key_rates_date', table_name='cbr_key_rates')
    op.drop_index('ix_cbr_key_rates_id', table_name='cbr_key_rates')
    
    # Drop table
    op.drop_table('cbr_key_rates')