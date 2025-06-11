import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teachai_app/services/ai_service.dart';

class AppState extends ChangeNotifier {
  bool _isLoading = false;
  String _currentScreen = 'home';
  ThemeMode _themeMode = ThemeMode.system;
  
  // 获取当前加载状态
  bool get isLoading => _isLoading;
  
  // 获取当前屏幕
  String get currentScreen => _currentScreen;

  // 获取主题模式
  ThemeMode get themeMode => _themeMode;

  // 构造函数，初始化时从SharedPreferences加载状态
  AppState() {
    _loadFromPrefs();
  }

  // 从SharedPreferences加载状态
  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    
    // 加载主题模式
    final themeModeIndex = prefs.getInt('themeMode') ?? 0;
    _themeMode = ThemeMode.values[themeModeIndex];
    
    notifyListeners();
  }

  // 保存状态到SharedPreferences
  Future<void> _saveToPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('themeMode', _themeMode.index);
  }

  // 设置主题模式
  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    _saveToPrefs();
    notifyListeners();
  }

  // 设置加载状态
  void setLoading(bool isLoading) {
    _isLoading = isLoading;
    notifyListeners();
  }

  // 设置当前屏幕
  void setCurrentScreen(String screenName) {
    _currentScreen = screenName;
    notifyListeners();
  }
} 