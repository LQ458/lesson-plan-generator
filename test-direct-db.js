const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/user-model');

async function testDirectDb() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/lesson-plan-generator');
    console.log('✅ Connected to MongoDB');

    // Check current users
    const existingUsers = await User.find();
    console.log('📊 Current users count:', existingUsers.length);
    console.log('📋 Current users:', existingUsers);

    // Try to create a user
    console.log('🔄 Creating test user...');
    const testUser = new User({
      username: 'directtest',
      displayName: 'Direct Test User',
      role: 'teacher'
    });

    await testUser.setPassword('test123');
    console.log('🔑 Password set');

    const savedUser = await testUser.save();
    console.log('💾 User saved with ID:', savedUser._id);

    // Verify it was actually saved
    const foundUser = await User.findById(savedUser._id);
    console.log('🔍 Found user after save:', !!foundUser);
    
    if (foundUser) {
      console.log('✅ User successfully persisted to database');
      console.log('👤 User details:', {
        id: foundUser._id,
        username: foundUser.username,
        displayName: foundUser.displayName
      });
    } else {
      console.log('❌ User not found after save - database persistence failed');
    }

    // Check total count again
    const finalCount = await User.countDocuments();
    console.log('📊 Final user count:', finalCount);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDirectDb();