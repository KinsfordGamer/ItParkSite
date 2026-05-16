from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/payments", tags=["payments"])


# ─── MUHIM: /stats/monthly ni /{payment_id} dan OLDIN define qilish kerak ────
@router.get("/stats/monthly")
async def get_payment_stats(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    stats = await db.payments.aggregate([
        {"$match": query},
        {"$group": {"_id": "$month", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]).to_list(None)

    return {"success": True, "data": stats}


@router.get("")
async def get_payments(
    student: Optional[str] = None,
    course: Optional[str] = None,
    month: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    if student:
        query["student"] = ObjectId(student)
    if course:
        query["course"] = ObjectId(course)
    if month:
        query["month"] = month

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "users", "localField": "receivedBy", "foreignField": "_id", "as": "receivedBy"}},
        {"$unwind": {"path": "$receivedBy", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}},
        {"$skip": (page - 1) * limit},
        {"$limit": limit}
    ]

    payments = await db.payments.aggregate(pipeline).to_list(None)
    total = await db.payments.count_documents(query)

    # Total amount via aggregation
    total_agg = await db.payments.aggregate([
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_amount = total_agg[0]["total"] if total_agg else 0

    return {
        "success": True,
        "data": [serialize_doc(p) for p in payments],
        "total": total,
        "totalAmount": total_amount,
        "page": page,
        "pages": -(-total // limit)
    }


@router.post("", status_code=201)
async def create_payment(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    student_id = body.get("student")
    amount = float(body.get("amount", 0))

    if not student_id:
        raise HTTPException(status_code=400, detail="Talaba ID majburiy")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="To'lov miqdori 0 dan katta bo'lishi kerak")

    query = {"_id": ObjectId(student_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    student = await db.students.find_one(query)
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    month = body.get("month") or datetime.utcnow().strftime("%Y-%m")

    # Parse date safely
    raw_date = body.get("date")
    if raw_date:
        if isinstance(raw_date, str):
            payment_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        else:
            payment_date = raw_date
    else:
        payment_date = datetime.utcnow()

    payment_data = {
        "student": ObjectId(student_id),
        "amount": amount,
        "month": month,
        "receivedBy": ObjectId(current_user["_id"]),
        "course": student.get("course"),
        "academy": student.get("academy"),
        "date": payment_date,
        "note": body.get("note", ""),
        "paymentMethod": body.get("paymentMethod", "cash"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    result = await db.payments.insert_one(payment_data)

    # Update student balance and totalPaid
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$inc": {"totalPaid": amount, "balance": amount}}
    )

    # 40% teacher share
    teacher_id = student.get("teacher")
    if not teacher_id and student.get("course"):
        course = await db.courses.find_one({"_id": student["course"]})
        teacher_id = course.get("teacher") if course else None

    if teacher_id:
        teacher_share = amount * 0.4
        await db.teachers.update_one({"_id": teacher_id}, {"$inc": {"salary": teacher_share}})

    payment = await db.payments.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(payment)}


@router.delete("/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()

    # Validate ObjectId
    try:
        oid = ObjectId(payment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Noto'g'ri to'lov ID")

    query = {"_id": oid}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    payment = await db.payments.find_one(query)
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")

    # Reverse student balance
    await db.students.update_one(
        {"_id": payment["student"]},
        {"$inc": {"totalPaid": -payment["amount"], "balance": -payment["amount"]}}
    )

    # Reverse teacher share
    student = await db.students.find_one({"_id": payment["student"]})
    teacher_id = student.get("teacher") if student else None
    if not teacher_id and payment.get("course"):
        course = await db.courses.find_one({"_id": payment["course"]})
        teacher_id = course.get("teacher") if course else None

    if teacher_id:
        teacher_share = payment["amount"] * 0.4
        await db.teachers.update_one({"_id": teacher_id}, {"$inc": {"salary": -teacher_share}})

    await db.payments.delete_one({"_id": oid})
    return {"success": True, "message": "To'lov bekor qilindi"}
