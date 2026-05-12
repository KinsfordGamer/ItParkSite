from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("")
async def get_grades(
    student: Optional[str] = None,
    course: Optional[str] = None,
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

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "users", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}}
    ]
    grades = await db.grades.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(g) for g in grades]}


@router.post("", status_code=201)
async def add_grade(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    student_id = body.get("student")
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    grade_data = {
        "student": ObjectId(student_id),
        "course": ObjectId(body["course"]) if body.get("course") else None,
        "grade": body.get("grade"),
        "comment": body.get("comment", ""),
        "teacher": ObjectId(current_user["_id"]),
        "academy": student.get("academy"),
        "date": body.get("date") or datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    if isinstance(grade_data.get("date"), str):
        grade_data["date"] = datetime.fromisoformat(grade_data["date"].replace("Z", "+00:00"))

    result = await db.grades.insert_one(grade_data)
    grade = await db.grades.find_one({"_id": result.inserted_id})
    return {"success": True, "data": serialize_doc(grade)}


@router.delete("/{grade_id}")
async def delete_grade(grade_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(grade_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    grade = await db.grades.find_one(query)
    if not grade:
        raise HTTPException(status_code=404, detail="Baholash topilmadi")

    teacher_id = str(grade.get("teacher", ""))
    is_authorized = (
        teacher_id == current_user["_id"] or
        current_user["role"] in ["admin", "superadmin", "manager"]
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    await db.grades.delete_one({"_id": ObjectId(grade_id)})
    return {"success": True, "message": "Baholash o'chirildi"}
