from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.ollama_service import ask_carbon_status_ollama

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/carbon-status", response_model=ChatResponse)
def chat_carbon_status(req: ChatRequest):
    try:
        reply = ask_carbon_status_ollama(req.message)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"เกิดข้อผิดพลาดในการเรียก Ollama: {str(e)}"
        )