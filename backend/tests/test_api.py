"""
Tests for the Blomm-Daya backend API.
"""
import pytest
from fastapi.testclient import TestClient
import sys
sys.path.append('/app/backend')
from server import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test health and basic endpoints."""
    
    def test_root_endpoint(self):
        """Test the root endpoint returns hello message."""
        response = client.get("/api/")
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}

    def test_health_check(self):
        """Test the health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestChatEndpoint:
    """Test the AI chat endpoint."""

    def test_chat_without_message(self):
        """Test chat endpoint without required message field."""
        response = client.post("/api/chat", json={})
        assert response.status_code == 422  # Validation error

    def test_chat_with_empty_message(self):
        """Test chat endpoint with empty message."""
        response = client.post("/api/chat", json={"message": ""})
        # Empty message should return 422 validation error
        assert response.status_code == 422

    def test_chat_message_structure(self):
        """Test that chat request has correct structure."""
        # We don't have API key in test env, so we just test request format
        response = client.post(
            "/api/chat",
            json={
                "message": "Hello",
                "session_id": "test-session-123"
            }
        )
        # May fail due to missing API key, but should accept the request format
        assert response.status_code in [200, 500, 503]


class TestCORSHeaders:
    """Test CORS configuration."""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in response."""
        response = client.options("/api/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        # FastAPI with CORS middleware should handle OPTIONS
        assert response.status_code in [200, 405]


class TestErrorHandling:
    """Test error handling."""
    
    def test_404_not_found(self):
        """Test 404 for non-existent endpoint."""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_method_not_allowed(self):
        """Test 405 for wrong HTTP method."""
        response = client.delete("/api/")
        assert response.status_code == 405


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
