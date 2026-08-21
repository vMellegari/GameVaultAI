import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
    
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    yield

    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def create_game(client, auth_headers):
    def _create_game(
        title="Test Game",
        platform="PC",
        **kwargs
    ):
        data = {
            "title": title,
            "platform": platform,
            **kwargs
        }

        response = client.post("/games", json=data, headers=auth_headers)

        assert response.status_code == 201, response.text

        return response.json()

    return _create_game

@pytest.fixture
def auth_headers(client):
    # Cria um usuário para os testes
    user_data = {
        "username": "testuser",
        "email": "testuser@email.com",
        "password": "123456"
    }

    response = client.post(
        "/users",
        json=user_data
    )

    assert response.status_code == 201, response.text

    # Faz login para obter o JWT
    response = client.post(
        "/login",
        json={
            "username": user_data["username"],
            "password": user_data["password"]
        }
    )

    assert response.status_code == 200, response.text

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }
@pytest.fixture
def second_auth_headers(client):
    user_data = {
        "username": "testuser2",
        "email": "testuser2@email.com",
        "password": "123456"
    }

    response = client.post(
        "/users",
        json=user_data
    )

    assert response.status_code == 201, response.text

    response = client.post(
        "/login",
        json={
            "username": user_data["username"],
            "password": user_data["password"]
        }
    )

    assert response.status_code == 200, response.text

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }