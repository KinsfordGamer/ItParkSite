const { register, login } = require('../src/controllers/authController');
const User = require('../src/models/User');

jest.mock('../src/models/User');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('login', () => {
    it('should return 400 if email or password missing', async () => {
      req.body = { email: 'test@test.com' };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 401 if user not found', async () => {
      req.body = { email: 'wrong@test.com', password: 'password' };
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
