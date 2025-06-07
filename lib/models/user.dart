import 'package:hive/hive.dart';

part 'user.g.dart';

@HiveType(typeId: 3)
class User extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String username;

  @HiveField(2)
  String email;

  @HiveField(3)
  String passwordHash;

  @HiveField(4)
  String displayName;

  @HiveField(5)
  String? avatar;

  @HiveField(6)
  DateTime createdAt;

  @HiveField(7)
  DateTime lastLoginAt;

  @HiveField(8)
  bool isFirstTime;

  @HiveField(9)
  bool hasSeenTour;

  @HiveField(10)
  String role; // 'teacher', 'admin', 'student'

  @HiveField(11)
  Map<String, dynamic> preferences;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.passwordHash,
    required this.displayName,
    this.avatar,
    required this.createdAt,
    required this.lastLoginAt,
    this.isFirstTime = true,
    this.hasSeenTour = false,
    this.role = 'teacher',
    this.preferences = const {},
  });

  // 创建默认用户
  factory User.defaultUser() {
    final now = DateTime.now();
    return User(
      id: 'default_user',
      username: 'teacher',
      email: 'teacher@bijie.edu.cn',
      passwordHash: '',
      displayName: '教师用户',
      createdAt: now,
      lastLoginAt: now,
      isFirstTime: true,
      hasSeenTour: false,
      role: 'teacher',
      preferences: {
        'theme': 'system',
        'language': 'zh_CN',
        'notifications': true,
      },
    );
  }

  // 更新最后登录时间
  void updateLastLogin() {
    lastLoginAt = DateTime.now();
    save();
  }

  // 标记已看过引导
  void markTourAsSeen() {
    hasSeenTour = true;
    isFirstTime = false;
    save();
  }

  // 更新用户偏好
  void updatePreferences(Map<String, dynamic> newPreferences) {
    preferences = {...preferences, ...newPreferences};
    save();
  }

  // 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'displayName': displayName,
      'avatar': avatar,
      'createdAt': createdAt.toIso8601String(),
      'lastLoginAt': lastLoginAt.toIso8601String(),
      'isFirstTime': isFirstTime,
      'hasSeenTour': hasSeenTour,
      'role': role,
      'preferences': preferences,
    };
  }

  // 从JSON创建
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      passwordHash: '',
      displayName: json['displayName'],
      avatar: json['avatar'],
      createdAt: DateTime.parse(json['createdAt']),
      lastLoginAt: DateTime.parse(json['lastLoginAt']),
      isFirstTime: json['isFirstTime'] ?? false,
      hasSeenTour: json['hasSeenTour'] ?? false,
      role: json['role'] ?? 'teacher',
      preferences: Map<String, dynamic>.from(json['preferences'] ?? {}),
    );
  }
} 