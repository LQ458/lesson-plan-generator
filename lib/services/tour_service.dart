import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:showcaseview/showcaseview.dart';
import '../services/auth_service.dart';
import '../utils/app_theme.dart';
import '../main.dart';

class TourService {
  // 使用UniqueKey替代部分GlobalKey
  static final UniqueKey _uniqueKey = UniqueKey();
  
  // 使用延迟初始化和可重置的GlobalKey
  static GlobalKey get profileKey => _profileKey ??= GlobalKey(debugLabel: 'profile');
  static GlobalKey? _profileKey;
  
  static GlobalKey get themeToggleKey => _themeToggleKey ??= GlobalKey(debugLabel: 'themeToggle');
  static GlobalKey? _themeToggleKey;
  
  static GlobalKey get offlineModeKey => _offlineModeKey ??= GlobalKey(debugLabel: 'offlineMode');
  static GlobalKey? _offlineModeKey;
  
  static GlobalKey get lessonPlanKey => _lessonPlanKey ??= GlobalKey(debugLabel: 'lessonPlan');
  static GlobalKey? _lessonPlanKey;
  
  static GlobalKey get exerciseKey => _exerciseKey ??= GlobalKey(debugLabel: 'exercise');
  static GlobalKey? _exerciseKey;
  
  static GlobalKey get mistakeAnalysisKey => _mistakeAnalysisKey ??= GlobalKey(debugLabel: 'mistakeAnalysis');
  static GlobalKey? _mistakeAnalysisKey;
  
  static GlobalKey get savedLessonsKey => _savedLessonsKey ??= GlobalKey(debugLabel: 'savedLessons');
  static GlobalKey? _savedLessonsKey;
  
  static GlobalKey get documentScanKey => _documentScanKey ??= GlobalKey(debugLabel: 'documentScan');
  static GlobalKey? _documentScanKey;

  // 重置所有GlobalKey的方法
  static void resetKeys() {
    _profileKey = null;
    _themeToggleKey = null;
    _offlineModeKey = null;
    _lessonPlanKey = null;
    _exerciseKey = null;
    _mistakeAnalysisKey = null;
    _savedLessonsKey = null;
    _documentScanKey = null;
  }

  // 引导步骤配置
  static List<TourStep> get tourSteps => [
    TourStep(
      key: profileKey,
      title: '个人中心',
      description: '查看和管理您的个人信息\n设置偏好、查看使用统计等',
      icon: CupertinoIcons.person_circle,
    ),
    TourStep(
      key: themeToggleKey,
      title: '主题切换',
      description: '点击这里可以切换应用的主题模式\n支持浅色、深色和跟随系统三种模式',
      icon: CupertinoIcons.sun_max,
    ),
    TourStep(
      key: offlineModeKey,
      title: '离线模式',
      description: '开启离线模式后，应用将使用本地AI模型\n无需网络连接即可使用核心功能',
      icon: CupertinoIcons.wifi_slash,
    ),
    TourStep(
      key: lessonPlanKey,
      title: '教案自动生成',
      description: '智能生成符合教学要求的教案\n支持多学科、多年级的教案模板',
      icon: CupertinoIcons.book,
    ),
    TourStep(
      key: exerciseKey,
      title: '分层练习推荐',
      description: '根据学生水平智能推荐练习题\n支持难度分层和个性化定制',
      icon: CupertinoIcons.layers_alt,
    ),
    TourStep(
      key: mistakeAnalysisKey,
      title: '错题分析',
      description: '智能分析学生错题模式\n帮助找出知识薄弱点并提供针对性建议',
      icon: CupertinoIcons.chart_bar,
    ),
    TourStep(
      key: savedLessonsKey,
      title: '已保存教案',
      description: '管理和查看您保存的教案\n支持搜索、筛选和编辑功能',
      icon: CupertinoIcons.folder,
    ),
    TourStep(
      key: documentScanKey,
      title: '纸质资料数字化',
      description: '使用OCR技术将纸质资料转为电子版\n支持文字识别和格式化处理',
      icon: CupertinoIcons.doc_text_viewfinder,
    ),
  ];

  // 开始引导
  static void startTour(BuildContext context) {
    if (!AuthService.hasSeenTour) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final navigatorContext = navigatorKey.currentContext;
        if (navigatorContext != null && navigatorContext.mounted) {
          print('Starting tour with keys: ${[profileKey, themeToggleKey, offlineModeKey, lessonPlanKey, exerciseKey, mistakeAnalysisKey, documentScanKey]}');
          ShowCaseWidget.of(navigatorContext).startShowCase([
            profileKey,
            themeToggleKey,
            offlineModeKey,
            lessonPlanKey,
            exerciseKey,
            mistakeAnalysisKey,
            savedLessonsKey,
            documentScanKey,
          ]);
        } else {
          print('Navigator context not available for tour');
        }
      });
    }
  }

  // 完成引导
  static Future<void> completeTour() async {
    await AuthService.markTourAsSeen();
  }

  // 手动重新开始引导
  static void restartTour(BuildContext context) {
    final navigatorContext = navigatorKey.currentContext;
    if (navigatorContext != null && navigatorContext.mounted) {
      print('Restarting tour manually');
      ShowCaseWidget.of(navigatorContext).startShowCase([
        profileKey,
        themeToggleKey,
        offlineModeKey,
        lessonPlanKey,
        exerciseKey,
        mistakeAnalysisKey,
        savedLessonsKey,
        documentScanKey,
      ]);
    } else {
      print('Navigator context not available for manual tour restart');
    }
  }

  // 创建Showcase组件
  static Widget buildShowcase({
    required GlobalKey key,
    required String title,
    required String description,
    required Widget child,
    VoidCallback? onTargetClick,
  }) {
    return Builder(
      builder: (context) {
        // 检查ShowCaseWidget上下文
        bool hasShowCaseWidget = false;
        try {
          ShowCaseWidget.of(context);
          hasShowCaseWidget = true;
        } catch (e) {
          print('ShowCaseWidget context not found: $e');
          hasShowCaseWidget = false;
        }
        
        // 如果没有ShowCaseWidget或key有问题,直接返回child
        if (!hasShowCaseWidget || key.currentContext?.mounted == false) {
          print('Falling back to original widget for $title');
          return child;
        }
        
        try {
          return Showcase(
            key: key,
            title: title,
            description: description,
            targetShapeBorder: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
            titleTextStyle: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            descTextStyle: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.4,
            ),
            overlayColor: Colors.black.withOpacity(0.8),
            targetBorderRadius: BorderRadius.circular(8),
            tooltipBackgroundColor: AppTheme.systemBlue,
            tooltipPadding: const EdgeInsets.all(16),
            onTargetClick: onTargetClick ?? () {},
            disposeOnTap: true,
            child: child,
          );
        } catch (e) {
          print('Showcase creation failed for $title: $e');
          return child; // 失败时返回原始widget
        }
      },
    );
  }

  // 显示欢迎对话框
  static void showWelcomeDialog(BuildContext context) {
    showCupertinoDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => CupertinoAlertDialog(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.hand_raised,
              color: AppTheme.systemBlue,
              size: 24,
            ),
            const SizedBox(width: 8),
            const Text('欢迎使用毕节教师助手！'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 12),
            Text(
              '这是您第一次使用本应用\n让我们为您介绍主要功能',
              style: TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () {
              Navigator.pop(context);
              // 延迟启动引导，确保对话框完全关闭
              Future.delayed(const Duration(milliseconds: 500), () {
                final navigatorContext = navigatorKey.currentContext;
                if (navigatorContext != null) {
                  print('Starting tour from welcome dialog');
                  ShowCaseWidget.of(navigatorContext).startShowCase([
                    profileKey,
                    themeToggleKey,
                    offlineModeKey,
                    lessonPlanKey,
                    exerciseKey,
                    mistakeAnalysisKey,
                    savedLessonsKey,
                    documentScanKey,
                  ]);
                } else {
                  print('Navigator context not available from welcome dialog');
                }
              });
            },
            child: const Text('开始引导'),
          ),
          CupertinoDialogAction(
            onPressed: () async {
              Navigator.pop(context);
              await completeTour();
            },
            child: const Text('跳过'),
          ),
        ],
      ),
    );
  }

  // 显示引导完成对话框
  static void showTourCompleteDialog(BuildContext context) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.checkmark_circle,
              color: AppTheme.systemGreen,
              size: 24,
            ),
            const SizedBox(width: 8),
            const Text('引导完成！'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 12),
            Text(
              '您已了解了应用的主要功能\n现在可以开始使用了！',
              style: TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () async {
              Navigator.pop(context);
              await completeTour();
            },
            child: const Text('开始使用'),
          ),
        ],
      ),
    );
  }

  // 检查并显示引导
  static void checkAndShowTour(BuildContext context) {
    print('Checking tour: isFirstTime=${AuthService.isFirstTime}, hasSeenTour=${AuthService.hasSeenTour}');
    if (AuthService.isLoggedIn && !AuthService.hasSeenTour) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
        showWelcomeDialog(context);
        }
      });
    }
  }

  // 强制显示引导（用于测试）
  static void forceShowTour(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) {
        showWelcomeDialog(context);
      }
    });
  }
}

// 引导步骤数据类
class TourStep {
  final GlobalKey key;
  final String title;
  final String description;
  final IconData icon;

  TourStep({
    required this.key,
    required this.title,
    required this.description,
    required this.icon,
  });
} 