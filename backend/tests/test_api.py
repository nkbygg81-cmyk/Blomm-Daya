"""
Backend API tests for Blomm-Daya Flower Shop
Tests the FastAPI backend endpoints
"""
import pytest
import requests
import os
import uuid

# Get API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://blomm-phase1-dev.preview.emergentagent.com"


class TestHealthEndpoints:
    """Health and status endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns expected message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint response: {data}")
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "timestamp" in data
        assert data.get("service") == "blomm-daya-api"
        print(f"Health check response: {data}")


class TestStatusEndpoints:
    """Status CRUD endpoint tests"""
    
    def test_create_status_check(self):
        """Test creating a status check"""
        test_name = f"TEST_client_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": test_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("client_name") == test_name
        assert "id" in data
        assert "timestamp" in data
        print(f"Created status check: {data}")
    
    def test_get_status_checks(self):
        """Test retrieving status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} status checks")


class TestChatEndpoints:
    """AI Chat endpoint tests"""
    
    def test_chat_endpoint(self):
        """Test chat endpoint - may return error if API key not configured"""
        session_id = f"TEST_session_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json={
                "session_id": session_id,
                "message": "Привіт! Порекомендуй букет на день народження"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert data.get("session_id") == session_id
        print(f"Chat response: {data.get('response')[:100]}...")
    
    def test_chat_history_endpoint(self):
        """Test chat history endpoint"""
        session_id = f"TEST_history_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/chat/history/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Chat history for {session_id}: {len(data)} messages")
    
    def test_clear_chat_history(self):
        """Test clearing chat history"""
        session_id = f"TEST_clear_{uuid.uuid4().hex[:8]}"
        response = requests.delete(f"{BASE_URL}/api/chat/history/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "cleared"
        print(f"Cleared chat history: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
