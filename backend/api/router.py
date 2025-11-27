# backend/api/router.py
from fastapi import APIRouter
from backend.api.routes import carbon_routes, chat_routes

api_router = APIRouter()

api_router.include_router(carbon_routes.router)
api_router.include_router(chat_routes.router)