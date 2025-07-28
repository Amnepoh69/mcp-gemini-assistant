"""create rate scenarios tables

Revision ID: 005
Revises: 004
Create Date: 2025-07-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rate_scenarios table
    op.create_table('rate_scenarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('scenario_type', sa.Enum('BASE', 'OPTIMISTIC', 'PESSIMISTIC', 'STRESS', 'CUSTOM', name='scenariotype'), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_rate_scenarios_id'), 'rate_scenarios', ['id'], unique=False)
    
    # Create rate_forecasts table
    op.create_table('rate_forecasts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scenario_id', sa.Integer(), nullable=False),
        sa.Column('indicator', sa.String(), nullable=True),
        sa.Column('forecast_date', sa.Date(), nullable=False),
        sa.Column('rate_value', sa.Float(), nullable=False),
        sa.Column('confidence_level', sa.Float(), nullable=True),
        sa.Column('min_value', sa.Float(), nullable=True),
        sa.Column('max_value', sa.Float(), nullable=True),
        sa.Column('data_type', sa.Enum('HISTORICAL', 'FORECAST', name='datatype'), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['scenario_id'], ['rate_scenarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rate_forecasts_id'), 'rate_forecasts', ['id'], unique=False)
    op.create_index(op.f('ix_rate_forecasts_forecast_date'), 'rate_forecasts', ['forecast_date'], unique=False)
    
    # Create unique constraint for scenario + date + indicator
    op.create_unique_constraint(
        'uq_rate_forecasts_scenario_date_indicator',
        'rate_forecasts',
        ['scenario_id', 'forecast_date', 'indicator']
    )


def downgrade() -> None:
    # Drop unique constraint
    op.drop_constraint('uq_rate_forecasts_scenario_date_indicator', 'rate_forecasts', type_='unique')
    
    # Drop indexes
    op.drop_index(op.f('ix_rate_forecasts_forecast_date'), table_name='rate_forecasts')
    op.drop_index(op.f('ix_rate_forecasts_id'), table_name='rate_forecasts')
    op.drop_index(op.f('ix_rate_scenarios_id'), table_name='rate_scenarios')
    
    # Drop tables
    op.drop_table('rate_forecasts')
    op.drop_table('rate_scenarios')
    
    # Drop enums
    sa.Enum(name='datatype').drop(op.get_bind())
    sa.Enum(name='scenariotype').drop(op.get_bind())