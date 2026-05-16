from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
async def get_courses(
    isActive: Optional[str] = None,
    teacher: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))
    if isActive is not None:
        query["isActive"] = isActive.lower() == "true"
    if teacher:
        query["teacher"] = ObjectId(teacher)

    # N+1 muammosini yechish: bitta aggregation pipeline bilan hamma ma'lumotni olamiz
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "teachers",
            "localField": "teacher",
            "foreignField": "_id",
            "as": "teacher"
        }},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
        # Active talabalar sonini bitta lookup bilan olamiz
        {"$lookup": {
            "from": "students",
            "let": {"courseId": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {
                    "$and": [
                        {"$eq": ["$course", "$$courseId"]},
                        {"$eq": ["$status", "active"]}
                    ]
                }}},
                {"$count": "count"}
            ],
            "as": "studentCountArr"
        }},
        {"$addFields": {
            "studentCount": {"$ifNull": [{"$arrayElemAt": ["$studentCountArr.count", 0]}, 0]}
        }},
        {"$project": {"studentCountArr": 0}},
        {"$sort": {"createdAt": -1}}
    ]

    courses = await db.courses.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(c) for c in courses]}


@router.get("/{course_id}")
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()

    try:
        oid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Noto'g'ri kurs ID")

    query = {"_id": oid}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "teachers", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
    ]
    results = await db.courses.aggregate(pipeline).to_list(1)
    if not results:
        raise HTTPException(status_code=404, detail="Kurs topilmadi")

    course = serialize_doc(results[0])
    students = await db.students.find(
        {"course": oid},
        {"name": 1, "phone": 1, "status": 1}
    ).to_list(None)
    course["students"] = [serialize_doc(s) for s in students]
    return {"success": True, "data": course}


@router.post("", status_code=201)
async def create_course(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    data = body.copy()
    academy_id = current_user.get("academy")
    if current_user["role"] == "superadmin" and data.get("academy"):
        academy_id = data["academy"]
    data["academy"] = ObjectId(academy_id) if academy_id else None
    if data.get("teacher"):
        data["teacher"] = ObjectId(data["teacher"])
    data["isActive"] = data.get("isActive", True)
    data["price"] = float(data.get("price", 0))
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()

    result = await db.courses.insert_one(data)
    course = await db.courses.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(course)}


@router.put("/{course_id}")
async def update_course(course_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()

    try:
        oid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Noto'g'ri kurs ID")

    query = {"_id": oid}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    update_data = {k: v for k, v in body.items() if k not in ["_id", "createdAt"]}
    if update_data.get("teacher"):
        update_data["teacher"] = ObjectId(update_data["teacher"])
    if "price" in update_data:
        update_data["price"] = float(update_data["price"])
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.courses.find_one_and_update(
        query, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Kurs topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/{course_id}")
async def delete_course(course_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()

    try:
        oid = ObjectId(course_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Noto'g'ri kurs ID")

    query = {"_id": oid}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    course = await db.courses.find_one(query)
    if not course:
        raise HTTPException(status_code=404, detail="Kurs topilmadi")

    student_count = await db.students.count_documents({"course": oid})
    if student_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Bu kursda {student_count} ta talaba mavjud, o'chirib bo'lmaydi"
        )

    await db.courses.delete_one({"_id": oid})
    return {"success": True, "message": "Kurs o'chirildi"}
