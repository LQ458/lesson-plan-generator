import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 模型缓存管理器
class ModelCacheManager {
  static final ModelCacheManager _instance = ModelCacheManager._internal();
  factory ModelCacheManager() => _instance;
  ModelCacheManager._internal();

  static const String _cachePrefix = 'model_cache_';
  static const String _downloadTimePrefix = 'download_time_';
  static const String _fileSizePrefix = 'file_size_';

  /// 检查模型是否在缓存中
  Future<bool> isModelCached(String modelId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = '$_cachePrefix$modelId';
      
      final cachedPath = prefs.getString(cacheKey);
      if (cachedPath == null) return false;

      final file = File(cachedPath);
      if (!await file.exists()) {
        await clearModelCache(modelId);
        return false;
      }

      final fileSize = await file.length();
      if (fileSize < 1024 * 1024) {
        debugPrint('⚠️ 缓存文件太小: $fileSize bytes');
        await clearModelCache(modelId);
        return false;
      }

      debugPrint('✅ 找到有效缓存: $cachedPath');
      return true;
    } catch (e) {
      debugPrint('❌ 检查缓存失败: $e');
      return false;
    }
  }

  /// 获取缓存的模型路径
  Future<String?> getCachedModelPath(String modelId) async {
    if (!await isModelCached(modelId)) return null;
    
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_cachePrefix$modelId');
  }

  /// 保存模型到缓存
  Future<void> cacheModel(String modelId, String filePath, int fileSize) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      await prefs.setString('$_cachePrefix$modelId', filePath);
      await prefs.setInt('$_fileSizePrefix$modelId', fileSize);
      await prefs.setInt('$_downloadTimePrefix$modelId', DateTime.now().millisecondsSinceEpoch);
      
      debugPrint('💾 模型已缓存: $modelId -> $filePath');
    } catch (e) {
      debugPrint('❌ 缓存模型失败: $e');
    }
  }

  /// 清理指定模型的缓存
  Future<void> clearModelCache(String modelId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      final cachedPath = prefs.getString('$_cachePrefix$modelId');
      if (cachedPath != null) {
        final file = File(cachedPath);
        if (await file.exists()) {
          await file.delete();
          debugPrint('🗑️ 删除缓存文件: $cachedPath');
        }
      }
      
      await prefs.remove('$_cachePrefix$modelId');
      await prefs.remove('$_fileSizePrefix$modelId');
      await prefs.remove('$_downloadTimePrefix$modelId');
      
      debugPrint('🧹 清理模型缓存: $modelId');
    } catch (e) {
      debugPrint('❌ 清理缓存失败: $e');
    }
  }

  /// 清理所有模型缓存
  Future<void> clearAllCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      
      for (final key in keys) {
        if (key.startsWith(_cachePrefix)) {
          final modelId = key.substring(_cachePrefix.length);
          await clearModelCache(modelId);
        }
      }
      
      debugPrint('🧹 清理所有模型缓存');
    } catch (e) {
      debugPrint('❌ 清理所有缓存失败: $e');
    }
  }

  /// 获取缓存信息
  Future<Map<String, dynamic>> getCacheInfo() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      final cacheInfo = <String, dynamic>{};
      
      int totalSize = 0;
      int modelCount = 0;
      
      for (final key in keys) {
        if (key.startsWith(_cachePrefix)) {
          final modelId = key.substring(_cachePrefix.length);
          final filePath = prefs.getString(key);
          final fileSize = prefs.getInt('$_fileSizePrefix$modelId') ?? 0;
          
          if (filePath != null) {
            final file = File(filePath);
            final exists = await file.exists();
            
            cacheInfo[modelId] = {
              'path': filePath,
              'size': fileSize,
              'exists': exists,
            };
            
            if (exists) {
              totalSize += fileSize;
              modelCount++;
            }
          }
        }
      }
      
      return {
        'models': cacheInfo,
        'totalSize': totalSize,
        'modelCount': modelCount,
      };
    } catch (e) {
      debugPrint('❌ 获取缓存信息失败: $e');
      return {
        'models': <String, dynamic>{},
        'totalSize': 0,
        'modelCount': 0,
      };
    }
  }
}