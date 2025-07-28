"""
Tests for official data source requirements
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from app.services.cbr_service import CBRService
from app.database import SessionLocal


def test_cbr_service_fails_without_official_data():
    """Test that CBRService raises exception when official data is unavailable"""
    db = SessionLocal()
    cbr_service = CBRService(db)
    
    # Mock all API methods to return empty results
    with patch.object(cbr_service, 'fetch_key_rate_data', return_value=[]):
        with patch.object(cbr_service, 'fetch_key_rate_data_rest', return_value=[]):
            with patch.object(cbr_service, 'fetch_key_rate_data_xml', return_value=[]):
                # This should raise an exception, not generate test data
                with pytest.raises(Exception) as exc_info:
                    cbr_service.update_key_rates(days_back=30)
                
                assert "Unable to fetch historical key rate data from CBR" in str(exc_info.value)
    
    db.close()


def test_no_test_data_generation_for_historical_periods():
    """Ensure generate_sample_historical_data is never called for real updates"""
    db = SessionLocal()
    cbr_service = CBRService(db)
    
    # Mock successful API call
    mock_data = [{
        'date': datetime.now() - timedelta(days=1),
        'effective_date': datetime.now() + timedelta(days=1),
        'rate': 21.0
    }]
    
    with patch.object(cbr_service, 'fetch_key_rate_data', return_value=mock_data):
        with patch.object(cbr_service, 'generate_sample_historical_data') as mock_generate:
            # Update should succeed without calling generate_sample_historical_data
            cbr_service.update_key_rates(days_back=7)
            
            # Verify test data generation was never called
            mock_generate.assert_not_called()
    
    db.close()


def test_data_source_endpoint():
    """Test the data source information endpoint"""
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    response = client.get("/api/v1/cbr/key-rate/data-source")
    
    assert response.status_code == 200
    data = response.json()
    
    # Check that we're using official data
    if data['total_records'] > 0:
        assert data['status'] == 'official_data'
        assert 'Central Bank of Russia' in data['source']['name']
        assert 'cbr.ru' in data['source']['url']
        assert data['disclaimer'] == "All historical key rate data is sourced directly from the official CBR API"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])