const { getStudentAttendanceStats } = require('../src/controllers/attendanceController');
const Attendance = require('../src/models/Attendance');
const mongoose = require('mongoose');

jest.mock('../src/models/Attendance');

describe('Attendance Controller', () => {
  let req, res;

  beforeEach(() => {
    req = { 
      user: { academy: new mongoose.Types.ObjectId().toString() },
      params: { studentId: new mongoose.Types.ObjectId().toString() },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getStudentAttendanceStats', () => {
    it('should calculate stats correctly', async () => {
      Attendance.aggregate.mockResolvedValue([
        { _id: 'present', count: 5 },
        { _id: 'absent', count: 1 },
      ]);

      await getStudentAttendanceStats(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          present: 5,
          absent: 1,
          total: 6,
          percentage: 83
        })
      }));
    });
  });
});
