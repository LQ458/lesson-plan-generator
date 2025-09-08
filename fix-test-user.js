/**
 * Fix test user password
 */

const mongoose = require('mongoose');
const User = require('./server/models/user-model.js');

async function fixTestUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/lesson-plan-generator');
    console.log('🔗 Connected to database');
    
    // Delete existing user
    await User.deleteOne({username: 'testuser'});
    console.log('🗑️ Deleted old testuser');
    
    // Create new user with proper password hashing
    const newUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      role: 'teacher',
      isActive: true,
      displayName: 'Test User',
      preferences: {
        theme: 'system',
        language: 'zh_CN',
        notifications: true,
        subject: 'math',
        gradeLevel: 'junior_1',
        easyMode: true
      }
    });
    
    // Set password using the model's method (this will hash it properly)
    await newUser.setPassword('password123');
    await newUser.save();
    
    console.log('✅ Created new test user successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: testuser');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Role: teacher');
    console.log('   Status: active');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing test user:', error);
    process.exit(1);
  }
}

fixTestUser();