from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("")
async def get_expenses(
    category: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    if category:
        query["category"] = category
    if startDate and endDate:
        query["date"] = {
            "$gte": datetime.fromisoformat(startDate.replace("Z", "")),
            "$lte": datetime.fromisoformat(endDate.replace("Z", ""))
        }

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "users", "localField": "addedBy", "foreignField": "_id", "as": "addedBy"}},
        {"$unwind": {"path": "$addedBy", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}}
    ]
    expenses = await db.expenses.aggregate(pipeline).to_list(None)
    total_amount = sum(e.get("amount", 0) for e in expenses)
    return {"success": True, "data": [serialize_doc(e) for e in expenses], "totalAmount": total_amount}


@router.post("", status_code=201)
async def add_expense(body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    expense_data = {
        **body,
        "academy": ObjectId(current_user.get("academy")),
        "addedBy": ObjectId(current_user["_id"]),
        "date": body.get("date") or datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    if isinstance(expense_data.get("date"), str):
        expense_data["date"] = datetime.fromisoformat(expense_data["date"].replace("Z", "+00:00"))

    result = await db.expenses.insert_one(expense_data)
    expense = await db.expenses.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(expense)}


@router.put("/{expense_id}")
async def update_expense(expense_id: str, body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(expense_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    update_data = body.copy()
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.expenses.find_one_and_update(query, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Xarajat topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(expense_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    result = await db.expenses.find_one_and_delete(query)
    if not result:
        raise HTTPException(status_code=404, detail="Xarajat topilmadi")
    return {"success": True, "message": "Xarajat o'chirildi"}
