"""Add hedging instruments tables

Revision ID: 006
Revises: 005
Create Date: 2025-01-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json

# revision identifiers
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    """Create hedging instruments and scenario_hedging tables."""
    
    # Create hedging_instruments table
    op.create_table(
        'hedging_instruments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('instrument_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('notional_amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=True, default='RUB'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('hedge_effectiveness', sa.Float(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hedging_instruments_id'), 'hedging_instruments', ['id'], unique=False)
    
    # Create scenario_hedging association table
    op.create_table(
        'scenario_hedging',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scenario_id', sa.Integer(), nullable=False),
        sa.Column('hedging_instrument_id', sa.Integer(), nullable=False),
        sa.Column('allocation_percentage', sa.Float(), nullable=True, default=100.0),
        sa.Column('active', sa.String(10), nullable=True, default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['hedging_instrument_id'], ['hedging_instruments.id'], ),
        sa.ForeignKeyConstraint(['scenario_id'], ['scenarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    """Drop hedging instruments and scenario_hedging tables."""
    op.drop_table('scenario_hedging')
    op.drop_index(op.f('ix_hedging_instruments_id'), table_name='hedging_instruments')
    op.drop_table('hedging_instruments')