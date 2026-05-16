from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, superadmin_only
from ..utils.auth import get_password_hash
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/academies", tags=["academies"])


@router.get("")
async def get_academies(current_user: dict = Depends(superadmin_only)):
    db = get_database()
    pipeline = [
        {"$lookup": {"from": "users", "localField": "owner", "foreignField": "_id", "as": "owner"}},
        {"$unwind": {"path": "$owner", "preserveNullAndEmptyArrays": True}},
    ]
    academies = await db.academies.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(a) for a in academies]}


@router.post("", status_code=201)
async def create_academy(body: dict, current_user: dict = Depends(superadmin_only)):
    db = get_database()
    name = body.get("name")
    slug = body.get("slug")
    owner_phone = body.get("ownerPhone")
    owner_name = body.get("ownerName")
    owner_password = body.get("ownerPassword")

    # Create or find owner
    owner = await db.users.find_one({"phone": owner_phone})
    if not owner:
        user_data = {
            "name": owner_name,
            "phone": owner_phone,
            "password": get_password_hash(owner_password),
            "role": "manager",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        owner_result = await db.users.insert_one(user_data)
        owner = await db.users.find_one({"_id": owner_result.inserted_id})

    # Create academy
    academy_data = {
        "name": name,
        "slug": slug,
        "owner": owner["_id"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    result = await db.academies.insert_one(academy_data)

    # Link owner to academy
    await db.users.update_one(
        {"_id": owner["_id"]},
        {"$set": {"academy": result.inserted_id}}
    )

    academy = await db.academies.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(academy)}


@router.put("/{academy_id}")
async def update_academy(academy_id: str, body: dict, current_user: dict = Depends(superadmin_only)):
    db = get_database()
    update_data = body.copy()
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.academies.find_one_and_update(
        {"_id": ObjectId(academy_id)},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Akademiya topilmadi")
    return {"success": True, "data": serialize_doc(result)}
