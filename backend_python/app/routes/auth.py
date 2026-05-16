# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
# pyrefly: ignore [missing-import]
from bson import ObjectId
# pyrefly: ignore [missing-import]
from datetime import datetime
from ..database import get_database
from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..utils.auth import get_password_hash, verify_password, create_access_token
from ..middleware.auth import get_current_user, admin_only, superadmin_only

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/seed-admin", status_code=201)
async def seed_admin():
    db = get_database()
    admin_exists = await db.users.find_one({"role": "superadmin"})
    if admin_exists:
        raise HTTPException(status_code=400, detail="Super Admin allaqachon mavjud")
    
    admin_data = {
        "name": "Main Super Admin",
        "phone": "998901234567",
        "password": get_password_hash("superpassword"),
        "role": "superadmin",
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(admin_data)
    token = create_access_token(str(result.inserted_id))
    
    return {
        "success": True,
        "message": "Super Admin yaratildi",
        "data": {
            "phone": "998901234567",
            "password": "superpassword",
            "token": token
        }
    }

@router.post("/login")
async def login(phone: str = Body(..., embed=True), password: str = Body(..., embed=True)):
    db = get_database()
    user = await db.users.find_one({"phone": phone})
    
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Telefon raqam yoki parol noto'g'ri")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=401, detail="Hisobingiz bloklangan")
    
    token = create_access_token(str(user["_id"]))
    
    user_data = user.copy()
    user_data["_id"] = str(user_data["_id"])
    if "password" in user_data:
        del user_data["password"]
    
    return {
        "success": True,
        "data": {**user_data, "token": token}
    }

@router.post("/register", status_code=201)
async def register(user_in: UserCreate, current_user: dict = Depends(admin_only)):
    db = get_database()
    user_exists = await db.users.find_one({"phone": user_in.phone})
    if user_exists:
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")
    
    academy_id = user_in.academy
    if current_user["role"] != "superadmin":
        academy_id = current_user.get("academy")
    
    user_data = user_in.dict()
    user_data["password"] = get_password_hash(user_data["password"])
    user_data["academy"] = ObjectId(academy_id) if academy_id else None
    user_data["createdAt"] = datetime.utcnow()
    user_data["updatedAt"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_data)
    token = create_access_token(str(result.inserted_id))
    
    user_data["_id"] = str(result.inserted_id)
    del user_data["password"]
    
    return {
        "success": True,
        "data": {**user_data, "token": token}
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = current_user.copy()
    if "password" in user_data:
        del user_data["password"]
    return {"success": True, "data": user_data}

@router.put("/me")
async def update_me(user_in: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    update_data = {k: v for k, v in user_in.dict(exclude_unset=True).items() if k != "password"}
    
    if "phone" in update_data:
        existing_user = await db.users.find_one({"phone": update_data["phone"], "_id": {"$ne": ObjectId(current_user["_id"])}})
        if existing_user:
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda")
    
    update_data["updatedAt"] = datetime.utcnow()
    
    await db.users.update_one({"_id": ObjectId(current_user["_id"])}, {"$set": update_data})
    
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    user["_id"] = str(user["_id"])
    if "password" in user:
        del user["password"]
        
    token = create_access_token(str(user["_id"]))
    
    return {"success": True, "data": {**user, "token": token}}

@router.put("/change-password")
async def change_password(current_password: str = Body(..., alias="currentPassword"), new_password: str = Body(..., alias="newPassword"), current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not verify_password(current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Joriy parol noto'g'ri")
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"password": get_password_hash(new_password), "updatedAt": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Parol muvaffaqiyatli o'zgartirildi"}

@router.get("/users")
async def get_users(current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {} if current_user["role"] == "superadmin" else {"academy": ObjectId(current_user.get("academy"))}
    
    users = await db.users.find(query).sort("createdAt", -1).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
        if "password" in u:
            del u["password"]
            
    return {"success": True, "data": users}
