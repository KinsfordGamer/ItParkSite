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
        query["isActive"] = isActive == "true"
    if teacher:
        query["teacher"] = ObjectId(teacher)

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "teachers", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"createdAt": -1}}
    ]
    courses = await db.courses.aggregate(pipeline).to_list(None)

    result = []
    for c in courses:
        c = serialize_doc(c)
        count = await db.students.count_documents({"course": ObjectId(c["_id"]), "status": "active"})
        c["studentCount"] = count
        result.append(c)

    return {"success": True, "data": result}


@router.get("/{course_id}")
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(course_id)}
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
    students = await db.students.find({"course": ObjectId(course_id)}, {"name": 1, "phone": 1, "status": 1}).to_list(None)
    course["students"] = [serialize_doc(s) for s in students]
    return {"success": True, "data": course}


@router.post("", status_code=201)
async def create_course(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    data = body.copy()
    data["academy"] = ObjectId(current_user.get("academy"))
    if data.get("teacher"):
        data["teacher"] = ObjectId(data["teacher"])
    data["isActive"] = data.get("isActive", True)
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()

    result = await db.courses.insert_one(data)
    course = await db.courses.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(course)}


@router.put("/{course_id}")
async def update_course(course_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(course_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    update_data = body.copy()
    if update_data.get("teacher"):
        update_data["teacher"] = ObjectId(update_data["teacher"])
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.courses.find_one_and_update(query, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Kurs topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/{course_id}")
async def delete_course(course_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(course_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    course = await db.courses.find_one(query)
    if not course:
        raise HTTPException(status_code=404, detail="Kurs topilmadi")

    student_count = await db.students.count_documents({"course": ObjectId(course_id)})
    if student_count > 0:
        raise HTTPException(status_code=400, detail="Bu kursda talabalar mavjud, o'chirib bo'lmaydi")

    await db.courses.delete_one({"_id": ObjectId(course_id)})
    return {"success": True, "message": "Kurs o'chirildi"}
