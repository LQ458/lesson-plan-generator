import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

class AuthService {
  static const String _userBoxName = 'users';
  static const String _currentUserKey = 'current_user_id';
  static const String _isLoggedInKey = 'is_logged_in';
  
  static Box<User>? _userBox;
  static User? _currentUser;

  // 初始化认证服务
  static Future<void> init() async {
    try {
      _userBox = await Hive.openBox<User>(_userBoxName);
      await _loadCurrentUser();
    } catch (e) {
      print('认证服务初始化失败: $e');
    }
  }

  // 加载当前用户
  static Future<void> _loadCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final isLoggedIn = prefs.getBool(_isLoggedInKey) ?? false;
    final currentUserId = prefs.getString(_currentUserKey);

    if (isLoggedIn && currentUserId != null && _userBox != null) {
      _currentUser = _userBox!.get(currentUserId);
      if (_currentUser != null) {
        _currentUser!.updateLastLogin();
      }
    }
  }

  // 获取当前用户
  static User? get currentUser => _currentUser;

  // 检查是否已登录
  static bool get isLoggedIn => _currentUser != null;

  // 检查是否是第一次使用
  static bool get isFirstTime => _currentUser?.isFirstTime ?? true;

  // 检查是否已看过引导
  static bool get hasSeenTour => _currentUser?.hasSeenTour ?? false;

  // 密码哈希
  static String _hashPassword(String password) {
    final bytes = utf8.encode(password);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  // 注册用户
  static Future<AuthResult> register({
    required String username,
    required String email,
    required String password,
    required String displayName,
    String role = 'teacher',
  }) async {
    try {
      if (_userBox == null) {
        return AuthResult.error('认证服务未初始化');
      }

      // 检查用户名是否已存在
      final existingUser = _userBox!.values.firstWhere(
        (user) => user.username == username || user.email == email,
        orElse: () => User.defaultUser()..id = '',
      );

      if (existingUser.id.isNotEmpty) {
        return AuthResult.error('用户名或邮箱已存在');
      }

      // 创建新用户
      final user = User(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        username: username,
        email: email,
        passwordHash: _hashPassword(password),
        displayName: displayName,
        createdAt: DateTime.now(),
        lastLoginAt: DateTime.now(),
        role: role,
        isFirstTime: true,
        hasSeenTour: false,
        preferences: {
          'theme': 'system',
          'language': 'zh_CN',
          'notifications': true,
        },
      );

      await _userBox!.put(user.id, user);
      await _setCurrentUser(user);

      return AuthResult.success(user);
    } catch (e) {
      return AuthResult.error('注册失败: $e');
    }
  }

  // 登录
  static Future<AuthResult> login({
    required String username,
    required String password,
  }) async {
    try {
      if (_userBox == null) {
        return AuthResult.error('认证服务未初始化');
      }

      final hashedPassword = _hashPassword(password);
      
      // 查找用户
      final user = _userBox!.values.firstWhere(
        (user) => (user.username == username || user.email == username) && 
                  user.passwordHash == hashedPassword,
        orElse: () => User.defaultUser()..id = '',
      );

      if (user.id.isEmpty) {
        return AuthResult.error('用户名或密码错误');
      }

      await _setCurrentUser(user);
      return AuthResult.success(user);
    } catch (e) {
      return AuthResult.error('登录失败: $e');
    }
  }

  // 游客登录（跳过登录）
  static Future<AuthResult> guestLogin() async {
    try {
      if (_userBox == null) {
        return AuthResult.error('认证服务未初始化');
      }

      // 创建或获取游客用户
      const guestId = 'guest_user';
      User? guestUser = _userBox!.get(guestId);
      
      if (guestUser == null) {
        guestUser = User(
          id: guestId,
          username: 'guest',
          email: 'guest@local.app',
          passwordHash: '',
          displayName: '游客用户',
          createdAt: DateTime.now(),
          lastLoginAt: DateTime.now(),
          role: 'guest',
          isFirstTime: true,
          hasSeenTour: false,
          preferences: {
            'theme': 'system',
            'language': 'zh_CN',
            'notifications': false,
          },
        );
        await _userBox!.put(guestId, guestUser);
      }

      await _setCurrentUser(guestUser);
      return AuthResult.success(guestUser);
    } catch (e) {
      return AuthResult.error('游客登录失败: $e');
    }
  }

  // 设置当前用户
  static Future<void> _setCurrentUser(User user) async {
    _currentUser = user;
    user.updateLastLogin();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isLoggedInKey, true);
    await prefs.setString(_currentUserKey, user.id);
  }

  // 登出
  static Future<void> logout() async {
    _currentUser = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isLoggedInKey, false);
    await prefs.remove(_currentUserKey);
  }

  // 标记引导已看过
  static Future<void> markTourAsSeen() async {
    if (_currentUser != null && _userBox != null) {
      _currentUser!.markTourAsSeen();
      await _userBox!.put(_currentUser!.id, _currentUser!);
    }
  }

  // 重置tour状态（用于测试）
  static Future<void> resetTourStatus() async {
    if (_currentUser != null && _userBox != null) {
      _currentUser!.isFirstTime = true;
      _currentUser!.hasSeenTour = false;
      await _userBox!.put(_currentUser!.id, _currentUser!);
    }
  }

  // 更新用户偏好
  static Future<void> updateUserPreferences(Map<String, dynamic> preferences) async {
    if (_currentUser != null) {
      _currentUser!.updatePreferences(preferences);
    }
  }

  // 获取所有用户（管理员功能）
  static List<User> getAllUsers() {
    if (_userBox == null) return [];
    return _userBox!.values.toList();
  }

  // 删除用户（管理员功能）
  static Future<bool> deleteUser(String userId) async {
    try {
      if (_userBox == null) return false;
      await _userBox!.delete(userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 重置密码
  static Future<AuthResult> resetPassword({
    required String username,
    required String newPassword,
  }) async {
    try {
      if (_userBox == null) {
        return AuthResult.error('认证服务未初始化');
      }

      final user = _userBox!.values.firstWhere(
        (user) => user.username == username || user.email == username,
        orElse: () => User.defaultUser()..id = '',
      );

      if (user.id.isEmpty) {
        return AuthResult.error('用户不存在');
      }

      user.passwordHash = _hashPassword(newPassword);
      await user.save();

      return AuthResult.success(user);
    } catch (e) {
      return AuthResult.error('重置密码失败: $e');
    }
  }
}

// 认证结果类
class AuthResult {
  final bool isSuccess;
  final String? error;
  final User? user;

  AuthResult._({
    required this.isSuccess,
    this.error,
    this.user,
  });

  factory AuthResult.success(User user) {
    return AuthResult._(
      isSuccess: true,
      user: user,
    );
  }

  factory AuthResult.error(String error) {
    return AuthResult._(
      isSuccess: false,
      error: error,
    );
  }
} 