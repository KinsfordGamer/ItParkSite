from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/salaries", tags=["salaries"])


@router.get("")
async def get_salaries(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "teachers", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}}
    ]
    salaries = await db.salaries.aggregate(pipeline).to_list(None)
    total_paid = sum(s.get("amount", 0) for s in salaries)
    return {"success": True, "data": [serialize_doc(s) for s in salaries], "totalPaid": total_paid}


@router.post("", status_code=201)
async def add_salary(body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    teacher_id = body.get("teacher")
    teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
    if not teacher:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")

    amount = body.get("amount", 0)
    salary_data = {
        "teacher": ObjectId(teacher_id),
        "amount": amount,
        "type": body.get("type", "monthly"),
        "note": body.get("note", ""),
        "month": body.get("month", datetime.utcnow().strftime("%Y-%m")),
        "academy": teacher.get("academy"),
        "paidBy": ObjectId(current_user["_id"]),
        "date": body.get("date") or datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    if isinstance(salary_data.get("date"), str):
        salary_data["date"] = datetime.fromisoformat(salary_data["date"].replace("Z", "+00:00"))

    result = await db.salaries.insert_one(salary_data)

    # Update teacher's salaryPaid
    await db.teachers.update_one({"_id": ObjectId(teacher_id)}, {"$inc": {"salaryPaid": amount}})

    salary = await db.salaries.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(salary)}


@router.put("/{salary_id}")
async def update_salary(salary_id: str, body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(salary_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    salary = await db.salaries.find_one(query)
    if not salary:
        raise HTTPException(status_code=404, detail="Topilmadi")

    old_amount = salary.get("amount", 0)
    new_amount = body.get("amount", old_amount)
    diff = new_amount - old_amount

    update_data = body.copy()
    update_data["updatedAt"] = datetime.utcnow()
    await db.salaries.update_one({"_id": ObjectId(salary_id)}, {"$set": update_data})

    if diff != 0:
        await db.teachers.update_one({"_id": salary["teacher"]}, {"$inc": {"salaryPaid": diff}})

    return {"success": True, "message": "Yangilandi"}


@router.delete("/{salary_id}")
async def delete_salary(salary_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(salary_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    salary = await db.salaries.find_one(query)
    if not salary:
        raise HTTPException(status_code=404, detail="Topilmadi")

    await db.teachers.update_one({"_id": salary["teacher"]}, {"$inc": {"salaryPaid": -salary["amount"]}})
    await db.salaries.delete_one({"_id": ObjectId(salary_id)})
    return {"success": True, "message": "O'chirildi"}
