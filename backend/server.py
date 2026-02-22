from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# AI Chatbot Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    session_id: str
    message: str
    
class ChatResponse(BaseModel):
    response: str
    session_id: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "blomm-daya-api"
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# AI Chatbot System Message for Blomm-Daya flower shop
CHATBOT_SYSTEM_MESSAGE = """Ти - дружній AI-асистент квіткового магазину Blomm-Daya. Твоя роль - допомагати покупцям з вибором квітів та букетів.

Ти можеш:
- Рекомендувати квіти для різних подій (дні народження, весілля, побачення, співчуття)
- Пояснювати значення різних квітів
- Давати поради з догляду за квітами
- Відповідати на питання про доставку та сервіс
- Допомагати вибрати кольорову гаму букета

Відповідай українською мовою (якщо користувач пише українською) або мовою користувача.
Будь ввічливим, корисним та лаконічним. Використовуй емодзі помірно 🌸💐🌷
Якщо не знаєш відповіді - скажи про це чесно."""

# Store chat sessions in memory (for simplicity)
chat_sessions: dict = {}

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Send a message to the AI chatbot and get a response"""
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return ChatResponse(
                response="AI чат-бот тимчасово недоступний. Зверніться до служби підтримки.",
                session_id=request.session_id
            )
        
        # Get or create chat session
        if request.session_id not in chat_sessions:
            chat_sessions[request.session_id] = LlmChat(
                api_key=api_key,
                session_id=request.session_id,
                system_message=CHATBOT_SYSTEM_MESSAGE
            ).with_model("openai", "gpt-4o")
        
        chat = chat_sessions[request.session_id]
        
        # Save user message to database
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.dict())
        
        # Send message to AI
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Save AI response to database
        ai_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(ai_msg.dict())
        
        return ChatResponse(
            response=response,
            session_id=request.session_id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return ChatResponse(
            response="Вибачте, сталася помилка. Спробуйте ще раз пізніше.",
            session_id=request.session_id
        )

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).to_list(100)
    
    return [
        {
            "role": msg["role"],
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
        }
        for msg in messages
    ]

@api_router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    await db.chat_messages.delete_many({"session_id": session_id})
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    return {"status": "cleared"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
