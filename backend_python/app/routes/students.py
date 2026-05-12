# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
# pyrefly: ignore [missing-import]
from datetime import datetime
# pyrefly: ignore [missing-import]
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import calculate_pro_rata_fee, serialize_doc

router = APIRouter(prefix="/students", tags=["students"])


@router.get("")
async def get_students(
    status: Optional[str] = None,
    course: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}

    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    if status:
        query["status"] = status
    if course:
        query["course"] = ObjectId(course)
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]

    target_month = month or datetime.utcnow().strftime("%Y-%m")

    pipeline = [
        {"$match": query},
        {
            "$lookup": {
                "from": "courses",
                "let": {"cId": "$course"},
                "pipeline": [
                    {"$match": {"$expr": {"$and": [
                        {"$ne": ["$$cId", None]},
                        {"$eq": ["$_id", "$$cId"]}
                    ]}}}
                ],
                "as": "courseData"
            }
        },
        {"$unwind": {"path": "$courseData", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "teachers",
                "let": {"tId": {"$ifNull": ["$teacher", "$courseData.teacher"]}},
                "pipeline": [
                    {"$match": {"$expr": {"$and": [
                        {"$ne": ["$$tId", None]},
                        {"$eq": ["$_id", "$$tId"]}
                    ]}}}
                ],
                "as": "teacherData"
            }
        },
        {"$unwind": {"path": "$teacherData", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "payments",
                "let": {"studentId": "$_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$and": [
                        {"$eq": ["$student", "$$studentId"]},
                        {"$eq": ["$month", target_month]}
                    ]}}}
                ],
                "as": "monthlyPayments"
            }
        },
        {
            "$addFields": {
                "course": "$courseData",
                "teacher": "$teacherData",
                "paidThisMonth": {"$sum": "$monthlyPayments.amount"}
            }
        },
        {
            "$addFields": {
                "debtThisMonth": {
                    "$max": [0, {"$subtract": [{"$ifNull": ["$courseData.price", 0]}, "$paidThisMonth"]}]
                }
            }
        },
        {"$sort": {"createdAt": -1}},
        {"$skip": (page - 1) * limit},
        {"$limit": limit}
    ]

    students = await db.students.aggregate(pipeline).to_list(None)
    total = await db.students.count_documents(query)

    processed = []
    for s in students:
        s = serialize_doc(s)
        course_price = (s.get("course") or {}).get("price", 0) or 0
        join_date = s.get("joinDate")
        expected = calculate_pro_rata_fee(join_date, course_price, target_month) if join_date else course_price
        paid = s.get("paidThisMonth", 0) or 0
        s["expectedPrice"] = expected
        s["debtThisMonth"] = max(0, expected - paid)
        processed.append(s)

    return {
        "success": True,
        "data": processed,
        "total": total,
        "page": page,
        "pages": -(-total // limit)
    }


@router.get("/{student_id}")
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "teachers", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
    ]
    results = await db.students.aggregate(pipeline).to_list(1)
    if not results:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")
    return {"success": True, "data": serialize_doc(results[0])}


@router.post("", status_code=201)
async def create_student(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    data = body.copy()
    data["academy"] = ObjectId(current_user.get("academy"))
    if data.get("course"):
        data["course"] = ObjectId(data["course"])
    if data.get("teacher"):
        data["teacher"] = ObjectId(data["teacher"])
    if data.get("joinDate"):
        data["joinDate"] = datetime.fromisoformat(data["joinDate"].replace("Z", "+00:00"))
    if data.get("birthDate"):
        data["birthDate"] = datetime.fromisoformat(data["birthDate"].replace("Z", "+00:00"))
    data["balance"] = data.get("balance", 0)
    data["totalPaid"] = data.get("totalPaid", 0)
    data["status"] = data.get("status", "active")
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()

    result = await db.students.insert_one(data)
    student = await db.students.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(student)}


@router.put("/{student_id}")
async def update_student(student_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    update_data = {k: v for k, v in body.items()}
    if update_data.get("course"):
        update_data["course"] = ObjectId(update_data["course"])
    if update_data.get("teacher"):
        update_data["teacher"] = ObjectId(update_data["teacher"])
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.students.find_one_and_update(
        query, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    result = await db.students.find_one_and_delete(query)
    if not result:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")
    return {"success": True, "message": "Talaba o'chirildi"}


@router.get("/{student_id}/payments")
async def get_student_payments(student_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"student": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}}
    ]
    payments = await db.payments.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(p) for p in payments]}


@router.post("/{student_id}/charge")
async def charge_student(student_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
    ]
    results = await db.students.aggregate(pipeline).to_list(1)
    if not results:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    student = results[0]
    target_month = datetime.utcnow().strftime("%Y-%m")
    course_price = (student.get("course") or {}).get("price", 0)
    amount = calculate_pro_rata_fee(student.get("joinDate"), course_price, target_month)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Ushbu oy uchun to'lov hisoblanmadi")

    await db.students.update_one({"_id": ObjectId(student_id)}, {"$inc": {"balance": -amount}})
    updated = await db.students.find_one({"_id": ObjectId(student_id)})
    return {"success": True, "message": "To'lov hisoblandi", "balance": updated.get("balance")}
