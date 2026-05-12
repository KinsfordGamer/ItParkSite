const { createStudent, getStudents } = require('../src/controllers/studentController');
const Student = require('../src/models/Student');

jest.mock('../src/models/Student');

describe('Student Controller', () => {
  let req, res;

  beforeEach(() => {
    req = { 
      user: { academy: 'academy123' },
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getStudents', () => {
    it('should fetch students with academy filter', async () => {
      Student.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      });
      Student.countDocuments.mockResolvedValue(0);

      await getStudents(req, res);

      expect(Student.find).toHaveBeenCalledWith(expect.objectContaining({ academy: 'academy123' }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [] }));
    });
  });

  describe('createStudent', () => {
    it('should create student with academy from req.user', async () => {
      req.body = { name: 'John Doe', phone: '123456789' };
      const mockStudent = { 
        ...req.body, 
        academy: 'academy123',
        populate: jest.fn().mockResolvedValue(true)
      };
      Student.create.mockResolvedValue(mockStudent);

      await createStudent(req, res);

      expect(Student.create).toHaveBeenCalledWith(expect.objectContaining({ academy: 'academy123' }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('chargeStudent', () => {
    const { chargeStudent } = require('../src/controllers/studentController');
    it('should return 400 if amount is 0', async () => {
      req.params = { id: 'student123' };
      Student.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ monthlyPrice: 0, course: null }),
      });
      await chargeStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
