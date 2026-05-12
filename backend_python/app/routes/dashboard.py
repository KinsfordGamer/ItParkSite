from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user
from ..utils.helpers import calculate_pro_rata_fee, serialize_doc

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    teacher_filter = {}
    student_filter = {}
    course_filter = {}
    payment_filter = {}
    grade_filter = {}
    expense_filter = {}

    if current_user["role"] != "superadmin":
        academy_id = ObjectId(current_user.get("academy"))
        teacher_filter["academy"] = academy_id
        student_filter["academy"] = academy_id
        course_filter["academy"] = academy_id
        payment_filter["academy"] = academy_id
        grade_filter["academy"] = academy_id
        expense_filter["academy"] = academy_id

        if current_user["role"] == "teacher":
            teacher = await db.teachers.find_one({"user": ObjectId(current_user["_id"]), "academy": academy_id})
            if teacher:
                tid = teacher["_id"]
                teacher_filter = {"_id": tid, "academy": academy_id}
                student_filter = {"teacher": tid, "academy": academy_id}
                course_filter = {"teacher": tid, "academy": academy_id}
                grade_filter = {"teacher": ObjectId(current_user["_id"]), "academy": academy_id}
                # Get student and course IDs for this teacher
                t_student_ids = await db.students.distinct("_id", {"teacher": tid})
                t_course_ids = await db.courses.distinct("_id", {"teacher": tid})
                payment_filter = {
                    "academy": academy_id,
                    "$or": [
                        {"student": {"$in": t_student_ids}},
                        {"course": {"$in": t_course_ids}}
                    ]
                }
                expense_filter = {"_id": None}  # Teachers don't see general expenses

    now = datetime.utcnow()
    start = datetime.fromisoformat(startDate.replace("Z", "")) if startDate else datetime(now.year, now.month, 1)
    end = datetime.fromisoformat(endDate.replace("Z", "")) if endDate else now
    if endDate:
        end = end.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Counts
    total_students = await db.students.count_documents(student_filter)
    active_students = await db.students.count_documents({**student_filter, "status": "active"})
    total_courses = await db.courses.count_documents(course_filter)
    active_courses = await db.courses.count_documents({**course_filter, "isActive": True})
    total_teachers = await db.teachers.count_documents(teacher_filter)
    all_academy_courses = await db.courses.find(course_filter, {"title": 1}).to_list(None)

    # Period Income
    income_agg = await db.payments.aggregate([
        {"$match": {**payment_filter, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_income = income_agg[0]["total"] if income_agg else 0

    # Period Salaries
    salary_agg = await db.salaries.aggregate([
        {"$match": {**teacher_filter, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_salaries = salary_agg[0]["total"] if salary_agg else 0

    # Period Expenses
    expense_agg = await db.expenses.aggregate([
        {"$match": {**expense_filter, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_expenses = expense_agg[0]["total"] if expense_agg else 0

    total_expenditure = total_salaries + total_expenses

    # Last 6 months income chart
    six_months_ago = datetime(end.year, end.month, 1)
    month_val = six_months_ago.month - 5
    year_val = six_months_ago.year
    if month_val <= 0:
        month_val += 12
        year_val -= 1
    six_months_ago = six_months_ago.replace(year=year_val, month=month_val)

    income_chart = await db.payments.aggregate([
        {"$match": {**payment_filter, "date": {"$gte": six_months_ago, "$lte": end}}},
        {"$group": {"_id": "$month", "income": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}}
    ]).to_list(None)

    # Student status distribution
    student_stats = await db.students.aggregate([
        {"$match": student_filter},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(None)

    # Attendance rate
    attendance_stats = await db.attendance.aggregate([
        {"$match": {**student_filter, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(None)
    total_att = sum(s["count"] for s in attendance_stats)
    present = next((s["count"] for s in attendance_stats if s["_id"] == "present"), 0)
    attendance_rate = round((present / total_att) * 100) if total_att > 0 else 0

    # Recent payments
    recent_payments_pipeline = [
        {"$match": payment_filter},
        {"$sort": {"date": -1}},
        {"$limit": 8},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
    ]
    recent_payments = await db.payments.aggregate(recent_payments_pipeline).to_list(None)

    # Debtors
    target_month = start.strftime("%Y-%m")
    debtor_pipeline = [
        {"$match": {**student_filter, "status": "active"}},
        {"$lookup": {
            "from": "courses",
            "let": {"cId": "$course"},
            "pipeline": [{"$match": {"$expr": {"$and": [{"$ne": ["$$cId", None]}, {"$eq": ["$_id", "$$cId"]}]}}}],
            "as": "courseData"
        }},
        {"$unwind": {"path": "$courseData", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "payments",
            "let": {"sid": "$_id"},
            "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$student", "$$sid"]}, {"$eq": ["$month", target_month]}]}}}],
            "as": "monthlyPayments"
        }},
        {"$addFields": {"paidThisMonth": {"$sum": "$monthlyPayments.amount"}}},
        {"$addFields": {"debtThisMonth": {"$max": [0, {"$subtract": [{"$ifNull": ["$courseData.price", 0]}, "$paidThisMonth"]}]}}},
        {"$match": {"debtThisMonth": {"$gt": 0}}},
        {"$sort": {"debtThisMonth": -1}}
    ]
    student_debts = await db.students.aggregate(debtor_pipeline).to_list(None)
    total_debt = sum(s.get("debtThisMonth", 0) for s in student_debts)
    debtors = [
        {
            "_id": str(s["_id"]),
            "name": s.get("name"),
            "phone": s.get("phone"),
            "course": serialize_doc(s.get("courseData")),
            "balance": -(s.get("debtThisMonth", 0))
        }
        for s in student_debts[:8]
    ]

    # At-risk students (absent > 2 times)
    absent_stats = await db.attendance.aggregate([
        {"$match": {**student_filter, "date": {"$gte": start, "$lte": end}, "status": "absent"}},
        {"$group": {"_id": "$student", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 2}}},
        {"$limit": 5}
    ]).to_list(None)
    at_risk_ids = [s["_id"] for s in absent_stats]
    at_risk_students = await db.students.find(
        {**student_filter, "_id": {"$in": at_risk_ids}},
        {"name": 1, "phone": 1}
    ).to_list(None)

    # Pending teacher salaries
    teachers_owed = await db.teachers.find(
        {**teacher_filter, "isActive": True, "$expr": {"$gt": ["$salary", "$salaryPaid"]}}
    ).limit(5).to_list(None)
    pending_salaries = [
        {"_id": str(t["_id"]), "name": t.get("name"), "amount": t.get("salary", 0) - t.get("salaryPaid", 0)}
        for t in teachers_owed
    ]

    # Performance stats
    performance_stats = await db.grades.aggregate([
        {"$match": {**grade_filter, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": "$course", "averageGrade": {"$avg": "$grade"}, "count": {"$sum": 1}}},
        {"$lookup": {"from": "courses", "localField": "_id", "foreignField": "_id", "as": "course"}},
        {"$unwind": "$course"},
        {"$project": {"courseTitle": "$course.title", "averageGrade": {"$round": ["$averageGrade", 1]}, "count": 1}}
    ]).to_list(None)

    # Student performance
    student_performance = await db.students.aggregate([
        {"$match": student_filter},
        {"$lookup": {
            "from": "grades",
            "let": {"sid": "$_id"},
            "pipeline": [{"$match": {"$expr": {"$and": [
                {"$eq": ["$student", "$$sid"]},
                {"$gte": ["$date", start]},
                {"$lte": ["$date", end]}
            ]}}}],
            "as": "studentGrades"
        }},
        {"$addFields": {"averageGrade": {"$avg": "$studentGrades.grade"}, "count": {"$size": "$studentGrades"}}},
        {"$match": {"count": {"$gt": 0}}},
        {"$project": {"name": 1, "phone": 1, "averageGrade": {"$round": ["$averageGrade", 1]}, "count": 1}},
        {"$sort": {"averageGrade": -1}}
    ]).to_list(None)

    # Recent grades
    recent_grades_pipeline = [
        {"$match": grade_filter},
        {"$sort": {"date": -1}},
        {"$limit": 8},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "users", "localField": "teacher", "foreignField": "_id", "as": "teacher"}},
        {"$unwind": {"path": "$teacher", "preserveNullAndEmptyArrays": True}},
    ]
    recent_grades = await db.grades.aggregate(recent_grades_pipeline).to_list(None)

    return {
        "success": True,
        "data": {
            "totalStudents": total_students,
            "activeStudents": active_students,
            "totalCourses": total_courses,
            "activeCourses": active_courses,
            "totalTeachers": total_teachers,
            "periodIncome": total_income,
            "periodExpenditure": total_expenditure,
            "totalDebt": total_debt,
            "attendanceRate": attendance_rate,
            "incomeChart": income_chart,
            "studentStats": student_stats,
            "recentPayments": [serialize_doc(p) for p in recent_payments],
            "debtors": debtors,
            "performanceStats": [serialize_doc(p) for p in performance_stats],
            "studentPerformance": [serialize_doc(p) for p in student_performance],
            "recentGrades": [serialize_doc(g) for g in recent_grades],
            "allCourses": [serialize_doc(c) for c in all_academy_courses],
            "insights": {
                "atRiskStudents": [serialize_doc(s) for s in at_risk_students],
                "pendingSalaries": pending_salaries
            }
        }
    }
