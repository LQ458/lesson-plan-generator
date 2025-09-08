// MongoDB Initialization Script for TeachAI
// Creates necessary users and indexes for optimal performance

// Switch to the TeachAI database
db = db.getSiblingDB('teachai');

print('🍃 Initializing MongoDB for TeachAI...');

// Create application user (if credentials are provided)
if (typeof TEACHAI_DB_USER !== 'undefined' && typeof TEACHAI_DB_PASSWORD !== 'undefined') {
    print('👤 Creating application user...');
    
    try {
        db.createUser({
            user: TEACHAI_DB_USER,
            pwd: TEACHAI_DB_PASSWORD,
            roles: [
                {
                    role: 'readWrite',
                    db: 'teachai'
                }
            ]
        });
        print('✅ Application user created successfully');
    } catch (error) {
        if (error.code === 11000) {
            print('ℹ️ User already exists, skipping creation');
        } else {
            print('❌ Error creating user:', error.message);
        }
    }
}

// Create collections and indexes
print('📊 Setting up collections and indexes...');

// Users collection
print('   Creating users collection...');
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true, background: true });
db.users.createIndex({ createdAt: 1 }, { background: true });
print('   ✅ Users collection ready');

// Lesson plans collection
print('   Creating lessonplans collection...');
db.createCollection('lessonplans');
db.lessonplans.createIndex({ userId: 1 }, { background: true });
db.lessonplans.createIndex({ subject: 1, grade: 1 }, { background: true });
db.lessonplans.createIndex({ createdAt: -1 }, { background: true });
db.lessonplans.createIndex({ 
    title: 'text', 
    content: 'text' 
}, { 
    background: true,
    name: 'lessonplan_text_index'
});
print('   ✅ Lesson plans collection ready');

// Exercises collection
print('   Creating exercises collection...');
db.createCollection('exercises');
db.exercises.createIndex({ userId: 1 }, { background: true });
db.exercises.createIndex({ subject: 1, grade: 1 }, { background: true });
db.exercises.createIndex({ type: 1 }, { background: true });
db.exercises.createIndex({ createdAt: -1 }, { background: true });
print('   ✅ Exercises collection ready');

// System logs collection (capped for log rotation)
print('   Creating system logs collection...');
db.createCollection('systemlogs', {
    capped: true,
    size: 100 * 1024 * 1024, // 100MB
    max: 50000 // Max 50k documents
});
db.systemlogs.createIndex({ timestamp: -1 }, { background: true });
db.systemlogs.createIndex({ level: 1 }, { background: true });
print('   ✅ System logs collection ready');

// API usage statistics collection
print('   Creating API usage collection...');
db.createCollection('apiusage');
db.apiusage.createIndex({ userId: 1, date: -1 }, { background: true });
db.apiusage.createIndex({ endpoint: 1, date: -1 }, { background: true });
print('   ✅ API usage collection ready');

// RAG query cache (for performance optimization)
print('   Creating RAG cache collection...');
db.createCollection('ragcache');
db.ragcache.createIndex({ queryHash: 1 }, { unique: true, background: true });
db.ragcache.createIndex({ 
    createdAt: 1 
}, { 
    expireAfterSeconds: 3600, // 1 hour TTL
    background: true 
});
print('   ✅ RAG cache collection ready');

// Create some sample data for development/testing
if (db.getName() === 'teachai' && db.users.countDocuments() === 0) {
    print('🌱 Creating sample data for development...');
    
    try {
        // Sample admin user (password should be changed in production)
        db.users.insertOne({
            email: 'admin@teachai.local',
            password: '$2b$10$rOyKdEW/Jf5Q4EGgE6.F3O7mCr9VLJeHGr7F2.kE8xG4d.9PF5k5e', // 'admin123'
            role: 'admin',
            isVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Sample lesson plan
        db.lessonplans.insertOne({
            userId: null, // Public template
            title: '欢迎使用 TeachAI 系统',
            subject: '其他',
            grade: '通用',
            content: '这是一个示例教案，展示 TeachAI 系统的功能。您可以根据需要修改或删除这个教案。',
            objectives: ['了解 TeachAI 系统基本功能', '学会创建和管理教案'],
            isTemplate: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        print('   ✅ Sample data created');
    } catch (error) {
        print('   ⚠️ Error creating sample data:', error.message);
    }
}

// Set up database-level settings for performance
print('🔧 Configuring database settings...');

// Set profiler to log slow operations (> 1000ms)
db.setProfilingLevel(1, { slowms: 1000 });

print('✅ MongoDB initialization complete!');

// Display collection statistics
print('\n📈 Collection Statistics:');
print('   Users:', db.users.countDocuments());
print('   Lesson Plans:', db.lessonplans.countDocuments());
print('   Exercises:', db.exercises.countDocuments());
print('   System Logs:', db.systemlogs.countDocuments());
print('   API Usage:', db.apiusage.countDocuments());
print('   RAG Cache:', db.ragcache.countDocuments());