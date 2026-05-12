const mongoose = require('mongoose');
const User = require('./src/models/User');
const Academy = require('./src/models/Academy');

mongoose.connect('mongodb://localhost:27017/academy_crm').then(async () => {
  try {
    let academy = await Academy.findOne();
    if (!academy) {
      academy = await Academy.create({ name: 'Asosiy Akademiya', slug: 'asosiy', isActive: true, subscriptionStatus: 'active' });
      console.log('Created Academy:', academy._id);
    }
    
    await User.updateMany({ role: 'admin' }, { $set: { academy: academy._id } });
    console.log('Assigned academy to admins.');

    // Also delete any orphan users that failed to become teachers
    const users = await User.find({ role: 'teacher' });
    let deleted = 0;
    const Teacher = require('./src/models/Teacher');
    for (const u of users) {
      const t = await Teacher.findOne({ user: u._id });
      if (!t) {
        await User.findByIdAndDelete(u._id);
        deleted++;
      }
    }
    console.log(`Deleted ${deleted} orphan users.`);
    
  } catch(e) {
    console.error('ERROR:', e);
  }
  process.exit();
});
