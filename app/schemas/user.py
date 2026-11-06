from pydantic import AliasChoices, BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    identifier: str = Field(validation_alias=AliasChoices("identifier", "username"))
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
