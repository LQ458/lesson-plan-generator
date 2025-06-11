import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';

/// 权限管理服务
/// 
/// 用于处理Android和iOS平台的权限请求，特别是存储权限和相机权限
class PermissionService {
  static final PermissionService _instance = PermissionService._internal();
  factory PermissionService() => _instance;
  PermissionService._internal();

  /// 检查并请求存储权限（用于模型下载）
  /// 
  /// Android 13+: 使用 MANAGE_EXTERNAL_STORAGE 权限
  /// Android 12及以下: 使用传统存储权限
  /// iOS: 使用照片库权限
  Future<bool> requestStoragePermission(BuildContext context) async {
    try {
      if (kIsWeb) {
        // Web平台不需要权限
        return true;
      }

      if (Platform.isAndroid) {
        return await _requestAndroidStoragePermission(context);
      } else if (Platform.isIOS) {
        return await _requestIOSStoragePermission(context);
      }
      
      return false;
    } catch (e) {
      debugPrint('权限请求失败: $e');
      return false;
    }
  }

  /// Android存储权限请求
  Future<bool> _requestAndroidStoragePermission(BuildContext context) async {
    // 检查Android版本，API 30+使用MANAGE_EXTERNAL_STORAGE
    if (Platform.isAndroid) {
      // 首先尝试请求管理外部存储权限（适用于Android 11+）
      PermissionStatus manageStorageStatus = await Permission.manageExternalStorage.status;
      
      if (manageStorageStatus.isGranted) {
        debugPrint('✅ Android管理外部存储权限已授予');
        return true;
      }
      
      if (manageStorageStatus.isDenied) {
        // 显示权限说明对话框
        bool shouldRequest = await _showPermissionRationale(
          context,
          title: '存储权限申请',
          message: '为了下载和管理AI模型文件，需要获取设备存储权限。\n\n这将允许应用：\n• 下载AI模型到本地存储\n• 管理模型文件缓存\n• 提供离线AI功能',
          permissionName: '存储权限',
        );
        
        if (!shouldRequest) return false;
        
        // 请求权限
        manageStorageStatus = await Permission.manageExternalStorage.request();
        
        if (manageStorageStatus.isGranted) {
          debugPrint('✅ Android管理外部存储权限已授予');
          return true;
        }
        
        if (manageStorageStatus.isPermanentlyDenied) {
          await _showPermissionDeniedDialog(context, '存储权限');
          return false;
        }
      }
      
      // 降级到传统存储权限（Android 12及以下）
      PermissionStatus storageStatus = await Permission.storage.status;
      
      if (storageStatus.isGranted) {
        debugPrint('✅ Android传统存储权限已授予');
        return true;
      }
      
      if (storageStatus.isDenied) {
        storageStatus = await Permission.storage.request();
        
        if (storageStatus.isGranted) {
          debugPrint('✅ Android传统存储权限已授予');
          return true;
        }
        
        if (storageStatus.isPermanentlyDenied) {
          await _showPermissionDeniedDialog(context, '存储权限');
          return false;
        }
      }
    }
    
    return false;
  }

  /// iOS存储权限请求  
  Future<bool> _requestIOSStoragePermission(BuildContext context) async {
    // iOS使用照片库权限来访问存储
    PermissionStatus photosStatus = await Permission.photos.status;
    
    if (photosStatus.isGranted) {
      debugPrint('✅ iOS照片库权限已授予');
      return true;
    }
    
    if (photosStatus.isDenied) {
      // 显示权限说明对话框
      bool shouldRequest = await _showPermissionRationale(
        context,
        title: '存储权限申请',
        message: '为了保存和管理AI模型文件，需要获取照片库访问权限。\n\n这将允许应用：\n• 保存AI模型到设备存储\n• 管理模型文件\n• 提供离线AI功能',
        permissionName: '照片库权限',
      );
      
      if (!shouldRequest) return false;
      
      photosStatus = await Permission.photos.request();
      
      if (photosStatus.isGranted) {
        debugPrint('✅ iOS照片库权限已授予');
        return true;
      }
      
      if (photosStatus.isPermanentlyDenied) {
        await _showPermissionDeniedDialog(context, '照片库权限');
        return false;
      }
    }
    
    return false;
  }

  /// 检查并请求相机权限（用于OCR拍照）
  Future<bool> requestCameraPermission(BuildContext context) async {
    try {
      if (kIsWeb) {
        // Web平台通过浏览器处理权限
        return true;
      }

      PermissionStatus cameraStatus = await Permission.camera.status;
      
      if (cameraStatus.isGranted) {
        debugPrint('✅ 相机权限已授予');
        return true;
      }
      
      if (cameraStatus.isDenied) {
        // 显示权限说明对话框
        bool shouldRequest = await _showPermissionRationale(
          context,
          title: '相机权限申请',
          message: '为了拍摄题目和文档进行文字识别，需要获取相机使用权限。\n\n这将允许应用：\n• 拍摄题目照片\n• 扫描文档\n• 进行OCR文字识别',
          permissionName: '相机权限',
        );
        
        if (!shouldRequest) return false;
        
        cameraStatus = await Permission.camera.request();
        
        if (cameraStatus.isGranted) {
          debugPrint('✅ 相机权限已授予');
          return true;
        }
        
        if (cameraStatus.isPermanentlyDenied) {
          await _showPermissionDeniedDialog(context, '相机权限');
          return false;
        }
      }
      
      return false;
    } catch (e) {
      debugPrint('相机权限请求失败: $e');
      return false;
    }
  }

  /// 显示权限说明对话框
  Future<bool> _showPermissionRationale(
    BuildContext context, {
    required String title,
    required String message,
    required String permissionName,
  }) async {
    return await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.security, color: Theme.of(context).primaryColor),
              const SizedBox(width: 8),
              Text(title),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Theme.of(context).primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '我们严格保护您的隐私，不会访问您的个人文件',
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('暂不授权'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text('授权$permissionName'),
            ),
          ],
        );
      },
    ) ?? false;
  }

  /// 显示权限被拒绝对话框
  Future<void> _showPermissionDeniedDialog(
    BuildContext context,
    String permissionName,
  ) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              const SizedBox(width: 8),
              Text('$permissionName已被禁用'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$permissionName已被永久拒绝，需要手动开启。'),
              const SizedBox(height: 16),
              Text(
                '请按以下步骤操作：\n'
                '1. 点击"打开设置"按钮\n'
                '2. 找到"权限管理"或"应用权限"\n'
                '3. 开启$permissionName\n'
                '4. 返回应用重试',
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('稍后再说'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await openAppSettings();
              },
              child: const Text('打开设置'),
            ),
          ],
        );
      },
    );
  }

  /// 检查所有必要权限的状态
  Future<Map<String, PermissionStatus>> checkAllPermissions() async {
    if (kIsWeb) {
      return {};
    }

    Map<String, PermissionStatus> permissionStatuses = {};
    
    try {
      if (Platform.isAndroid) {
        permissionStatuses['manageExternalStorage'] = await Permission.manageExternalStorage.status;
        permissionStatuses['storage'] = await Permission.storage.status;
      } else if (Platform.isIOS) {
        permissionStatuses['photos'] = await Permission.photos.status;
      }
      
      permissionStatuses['camera'] = await Permission.camera.status;
      
    } catch (e) {
      debugPrint('检查权限状态失败: $e');
    }
    
    return permissionStatuses;
  }

  /// 是否已获得存储权限
  Future<bool> hasStoragePermission() async {
    if (kIsWeb) return true;
    
    try {
      if (Platform.isAndroid) {
        // 检查管理外部存储权限或传统存储权限
        final manageStorageStatus = await Permission.manageExternalStorage.status;
        if (manageStorageStatus.isGranted) return true;
        
        final storageStatus = await Permission.storage.status;
        return storageStatus.isGranted;
      } else if (Platform.isIOS) {
        final photosStatus = await Permission.photos.status;
        return photosStatus.isGranted;
      }
    } catch (e) {
      debugPrint('检查存储权限失败: $e');
    }
    
    return false;
  }

  /// 是否已获得相机权限
  Future<bool> hasCameraPermission() async {
    if (kIsWeb) return true;
    
    try {
      final cameraStatus = await Permission.camera.status;
      return cameraStatus.isGranted;
    } catch (e) {
      debugPrint('检查相机权限失败: $e');
    }
    
    return false;
  }
} 