import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teachai_app/services/ai_service.dart';

class AppState extends ChangeNotifier {
  bool _isOfflineMode = false;
  bool _isLoading = false;
  bool _isModelLoaded = false;
  String _currentScreen = 'home';
  double _downloadProgress = 0.0;
  String? _downloadError;
  ThemeMode _themeMode = ThemeMode.system;
  final AIService _aiService = AIService();

  // 获取当前离线模式状态
  bool get isOfflineMode => _isOfflineMode;
  
  // 获取当前加载状态
  bool get isLoading => _isLoading;
  
  // 获取模型是否已加载
  bool get isModelLoaded => _isModelLoaded;
  
  // 获取当前屏幕
  String get currentScreen => _currentScreen;
  
  // 获取下载进度
  double get downloadProgress => _downloadProgress;
  
  // 获取下载错误信息
  String? get downloadError => _downloadError;

  // 获取主题模式
  ThemeMode get themeMode => _themeMode;

  // 构造函数，初始化时从SharedPreferences加载状态
  AppState() {
    _loadFromPrefs();
  }

  // 从SharedPreferences加载状态
  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    _isOfflineMode = prefs.getBool('isOfflineMode') ?? false;
    _isModelLoaded = prefs.getBool('isModelLoaded') ?? false;
    
    // 加载主题模式
    final themeModeIndex = prefs.getInt('themeMode') ?? 0;
    _themeMode = ThemeMode.values[themeModeIndex];
    
    // 检查AI模型是否真的已加载
    if (_isModelLoaded) {
      _checkModelStatus();
    }
    
    notifyListeners();
  }
  
  // 检查模型实际状态
  Future<void> _checkModelStatus() async {
    try {
      final result = await _aiService.initModel();
      _isModelLoaded = result;
      _saveToPrefs();
      notifyListeners();
    } catch (e) {
      _isModelLoaded = false;
      _saveToPrefs();
      notifyListeners();
    }
  }

  // 保存状态到SharedPreferences
  Future<void> _saveToPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isOfflineMode', _isOfflineMode);
    await prefs.setBool('isModelLoaded', _isModelLoaded);
    await prefs.setInt('themeMode', _themeMode.index);
  }

  // 切换离线模式
  void toggleOfflineMode() {
    _isOfflineMode = !_isOfflineMode;
    _saveToPrefs();
    notifyListeners();
  }

  // 设置加载状态
  void setLoading(bool isLoading) {
    _isLoading = isLoading;
    notifyListeners();
  }

  // 设置模型加载状态
  void setModelLoaded(bool isLoaded) {
    _isModelLoaded = isLoaded;
    _saveToPrefs();
    notifyListeners();
  }

  // 设置当前屏幕
  void setCurrentScreen(String screenName) {
    _currentScreen = screenName;
    notifyListeners();
  }
  
  // 下载并初始化AI模型
  Future<bool> downloadAndInitModel() async {
    if (_isLoading) return false;
    
    setLoading(true);
    _downloadProgress = 0.0;
    _downloadError = null;
    notifyListeners();
    
    try {
      final result = await _aiService.downloadModel(
        onProgress: (progress) {
          _downloadProgress = progress;
          notifyListeners();
        },
        onSuccess: () {
          _isModelLoaded = true;
          _saveToPrefs();
        },
        onError: (error) {
          _downloadError = error;
        },
      );
      
      setLoading(false);
      return result;
    } catch (e) {
      _downloadError = e.toString();
      setLoading(false);
      return false;
    }
  }
  
  // 生成教案
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
  }) async {
    if (!_isModelLoaded) {
      return '错误：AI模型未加载，请先下载并初始化模型';
    }
    
    setLoading(true);
    notifyListeners();
    
    try {
      final result = await _aiService.generateLessonPlan(
        subject: subject,
        grade: grade,
        topic: topic,
      );
      
      setLoading(false);
      return result;
    } catch (e) {
      setLoading(false);
      return '生成教案失败：${e.toString()}';
    }
  }
  
  // 生成练习题
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    if (!_isModelLoaded) {
      return '错误：AI模型未加载，请先下载并初始化模型';
    }
    
    setLoading(true);
    notifyListeners();
    
    try {
      final result = await _aiService.generateExercises(
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        count: count,
      );
      
      setLoading(false);
      return result;
    } catch (e) {
      setLoading(false);
      return '生成练习题失败：${e.toString()}';
    }
  }
  
  // OCR文本识别
  Future<String> recognizeText(String imagePath) async {
    setLoading(true);
    notifyListeners();
    
    try {
      final result = await _aiService.recognizeText(imagePath);
      
      setLoading(false);
      return result;
    } catch (e) {
      setLoading(false);
      return '文本识别失败：${e.toString()}';
    }
  }

  // 切换主题模式
  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    _saveToPrefs();
    notifyListeners();
  }

  // 循环切换主题模式
  void toggleThemeMode() {
    switch (_themeMode) {
      case ThemeMode.system:
        _themeMode = ThemeMode.light;
        break;
      case ThemeMode.light:
        _themeMode = ThemeMode.dark;
        break;
      case ThemeMode.dark:
        _themeMode = ThemeMode.system;
        break;
    }
    _saveToPrefs();
    notifyListeners();
  }
} 