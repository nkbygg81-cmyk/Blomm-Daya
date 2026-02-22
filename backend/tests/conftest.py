"""Test configuration and fixtures."""
import pytest
import sys
sys.path.append('/app/backend')


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    from fastapi.testclient import TestClient
    from server import app
    return TestClient(app)


@pytest.fixture
def sample_chat_message():
    """Sample chat message for testing."""
    return {
        "message": "What flowers are good for a birthday?",
        "session_id": "test-session-123"
    }


@pytest.fixture
def sample_buyer():
    """Sample buyer data for testing."""
    return {
        "email": "test@example.com",
        "name": "Test User",
        "phone": "+380501234567"
    }


@pytest.fixture
def sample_order():
    """Sample order data for testing."""
    return {
        "items": [
            {
                "flowerId": "test-flower-1",
                "name": "Red Roses",
                "price": 450,
                "qty": 1
            }
        ],
        "total": 450,
        "deliveryAddress": {
            "street": "Test Street 1",
            "city": "Kyiv",
            "country": "Ukraine"
        }
    }
