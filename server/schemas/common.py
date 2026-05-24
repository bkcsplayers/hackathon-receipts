from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    status: str = "ok"


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20
