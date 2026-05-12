const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { 
      type: String, 
      enum: ['superadmin', 'manager', 'admin', 'administrator', 'teacher'], 
      default: 'teacher' 
    },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy' },
    phone: { type: String, required: true, unique: true, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
