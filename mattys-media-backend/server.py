from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import uuid
import bcrypt
import jwt
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ========== MODELS ==========


class Product(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    description: str
    base_price: float
    images: List[str]
    specifications: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    base_price: float
    images: List[str]
    specifications: dict


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserResponse(BaseModel):
    id: str
    email: str
    name: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class CartItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    custom_text: Optional[str] = None
    price: float


class CartCreate(BaseModel):
    items: List[CartItem]


class Cart(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItem]
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CartResponse(BaseModel):
    id: str
    items: List[CartItem]
    total: float


# ========== AUTH UTILITIES ==========


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        return user_doc
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ========== ENDPOINTS ==========


@api_router.get("/")
async def root():
    return {"message": "Mattty's Media API - Gen Z Print Shop"}


# Products
@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(category: Optional[str] = None):
    query = {} if not category else {"category": category}
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products


@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.post("/products/seed")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing > 0:
        # return {"message": "Products already seeded"}
        try:
            await db.products.drop()
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to drop DB or collection: {e}"
            )

    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Business Cards",
            "category": "business-cards",
            "description": "Make a lasting impression with our ultra-thick 32pt cards. Matte or gloss finish available.",
            "base_price": 29.99,
            "images": [
                "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800",
                "https://images.unsplash.com/photo-1620714223589-a0ad3b4aaac9?w=800",
                "https://images.unsplash.com/photo-1611926653670-1c0426c4c0c5?w=800",
            ],
            "specifications": {
                "size": '3.5" x 2"',
                "material": "32pt Premium Cardstock",
                "finish": "Matte/Gloss",
                "quantity": "250 cards",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vibrant Vinyl Banners",
            "category": "banners",
            "description": "Weather-resistant vinyl banners perfect for outdoor events. UV-resistant inks guaranteed.",
            "base_price": 89.99,
            "images": [
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800",
                "https://images.unsplash.com/photo-1579547621309-0a9f9ab3bc13?w=800",
            ],
            "specifications": {
                "size": "4ft x 8ft",
                "material": "13oz Vinyl",
                "finish": "Matte",
                "grommets": "Yes",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Museum-Quality Posters",
            "category": "posters",
            "description": "Gallery-grade posters on premium paper. Perfect for art prints and promotional displays.",
            "base_price": 39.99,
            "images": [
                # "https://images.unsplash.com/photo-1567680961139-b59a29e03396?w=800",
                "https://images.unsplash.com/photo-1724443907272-75019844f658?w=800",
                "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
            ],
            "specifications": {
                "size": '24" x 36"',
                "material": "200gsm Silk Paper",
                "finish": "Satin",
                "lamination": "Optional",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Luxury Business Cards",
            "category": "business-cards",
            "description": "Ultra-premium black metal cards with laser engraving. The ultimate flex.",
            "base_price": 199.99,
            "images": [
                "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=800",
                "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800",
                "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800",
            ],
            "specifications": {
                "size": '3.5" x 2"',
                "material": "Stainless Steel",
                "finish": "Brushed Metal",
                "quantity": "100 cards",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mesh Fence Banners",
            "category": "banners",
            "description": "Wind-resistant mesh banners for construction sites and outdoor venues.",
            "base_price": 129.99,
            "images": [
                "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
                "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=800",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
            ],
            "specifications": {
                "size": "8ft x 10ft",
                "material": "Mesh Vinyl",
                "finish": "Matte",
                "wind_slits": "Yes",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Holographic Posters",
            "category": "posters",
            "description": "Next-gen holographic posters that shift colors. Pure Gen Z energy.",
            "base_price": 79.99,
            "images": [
                "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
                "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800",
                "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800",
            ],
            "specifications": {
                "size": '18" x 24"',
                "material": "Holographic Film",
                "finish": "Metallic Shimmer",
                "backing": "Foam Core",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    await db.products.insert_many(products)
    return {"message": f"Seeded {len(products)} products"}


# Auth
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
    )

    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    await db.users.insert_one(user_dict)

    token = create_token(user.id)
    return AuthResponse(
        token=token, user=UserResponse(id=user.id, email=user.email, name=user.name)
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(
        credentials.password, user_doc["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user_doc["id"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_doc["id"], email=user_doc["email"], name=user_doc["name"]
        ),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"], email=current_user["email"], name=current_user["name"]
    )


# Cart
@api_router.post("/cart", response_model=CartResponse)
async def create_or_update_cart(
    cart_data: CartCreate, current_user: dict = Depends(get_current_user)
):
    total = sum(item.price * item.quantity for item in cart_data.items)

    cart = Cart(
        user_id=current_user["id"],
        items=[item.model_dump() for item in cart_data.items],
        total=total,
    )

    cart_dict = cart.model_dump()
    cart_dict["created_at"] = cart_dict["created_at"].isoformat()
    cart_dict["updated_at"] = cart_dict["updated_at"].isoformat()

    existing_cart = await db.carts.find_one({"user_id": current_user["id"]})
    if existing_cart:
        await db.carts.update_one(
            {"user_id": current_user["id"]},
            {
                "$set": {
                    "items": cart_dict["items"],
                    "total": cart_dict["total"],
                    "updated_at": cart_dict["updated_at"],
                }
            },
        )
        cart_dict["id"] = existing_cart["id"]
    else:
        await db.carts.insert_one(cart_dict)

    return CartResponse(id=cart_dict["id"], items=cart_data.items, total=total)


@api_router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart_doc = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart_doc:
        return CartResponse(id="", items=[], total=0.0)

    return CartResponse(
        id=cart_doc["id"],
        items=[CartItem(**item) for item in cart_doc["items"]],
        total=cart_doc["total"],
    )


@api_router.delete("/cart")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    await db.carts.delete_one({"user_id": current_user["id"]})
    return {"message": "Cart cleared"}


# WhatsApp checkout
@api_router.post("/checkout/whatsapp")
async def generate_whatsapp_message(current_user: dict = Depends(get_current_user)):
    cart_doc = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart_doc or not cart_doc.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    message_lines = [
        f"🔥 NEW ORDER from {current_user['name']}",
        f"📧 Email: {current_user['email']}",
        "",
        "📦 ITEMS:",
    ]

    for item in cart_doc["items"]:
        custom_text = (
            f" | Custom: {item.get('custom_text')}" if item.get("custom_text") else ""
        )
        message_lines.append(
            f"• {item['product_name']} x{item['quantity']} - ${item['price']:.2f}{custom_text}"
        )

    message_lines.append("")
    message_lines.append(f"💰 TOTAL: ${cart_doc['total']:.2f}")

    message = "%0A".join(message_lines)
    whatsapp_url = f"https://wa.me/?text={message}"

    return {"whatsapp_url": whatsapp_url, "message": message}


# Include router in app
app.include_router(api_router)

# CORS
origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy"}
