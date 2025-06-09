import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/screens/document_scan_screen.dart';
import 'package:teachai_app/screens/exercise_recommendation_screen.dart';
import 'package:teachai_app/screens/lesson_plan_screen.dart';
import 'package:teachai_app/screens/mistake_analysis_screen.dart';
import 'package:teachai_app/screens/saved_lessons_screen.dart';
import 'package:teachai_app/services/tour_service.dart';
import 'package:teachai_app/screens/user_profile_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // 添加状态变量
  bool _isButtonsVisible = true;
  
  @override
  void initState() {
    super.initState();
    // 确保在初始化时重置GlobalKey
    TourService.resetKeys();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // 确保从其他页面返回时状态正确
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(() {
          _isButtonsVisible = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('首页'),
            actions: [
              _buildThemeToggleButton(appState),
              _buildOfflineModeButton(appState),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _navigateToProfile,
                child: TourService.buildShowcase(
                  key: TourService.profileKey,
                  title: '个人中心',
                  description: '点击这里进入个人中心\n可以查看和修改个人信息',
                  child: const Icon(Icons.person, color: AppTheme.primaryColor),
                ),
              ),
            ],
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 欢迎信息
                  Text(
                    '欢迎使用毕节教师助手',
                    style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    appState.isOfflineMode 
                        ? '当前为离线模式，部分功能可能受限' 
                        : '当前为在线模式，可使用全部功能',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      color: AppTheme.systemGray,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // 功能模块标题
                  Text(
                    '核心功能',
                    style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
                  ),
                  const SizedBox(height: 16),
                  
                  // 功能卡片网格
                  _buildFeatureGrid(context, appState, CupertinoTheme.of(context).brightness == Brightness.dark),
                  
                  const SizedBox(height: 24),
                  
                  // 离线模型状态
                  _buildOfflineModelStatus(context, CupertinoTheme.of(context).brightness == Brightness.dark),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeatureGrid(BuildContext context, AppState appState, bool isDark) {
    return GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.9, // 调整卡片宽高比以适应更多内容
                children: [
                  // 教案自动生成
                  TourService.buildShowcase(
                    key: TourService.lessonPlanKey,
                    title: '教案自动生成',
                    description: '智能生成符合教学要求的教案\n支持多学科、多年级的教案模板',
                    child: _buildFeatureCard(
                    context,
                    title: '教案自动生成',
                    description: '快速生成符合教学要求的教案',
                    icon: CupertinoIcons.book,
                    color: AppTheme.systemBlue,
                    isOfflineAvailable: true,
                    appState: appState,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const LessonPlanScreen(),
                        ),
                      );
                    },
                    ),
                  ),
                  
                  // 分层练习推荐
                  TourService.buildShowcase(
                    key: TourService.exerciseKey,
                    title: '分层练习推荐',
                    description: '根据学生水平智能推荐练习题\n支持难度分层和个性化定制',
                    child: _buildFeatureCard(
                    context,
                    title: '分层练习推荐',
                    description: '根据学生水平推荐适合的练习题',
                    icon: CupertinoIcons.layers_alt,
                    color: AppTheme.systemGreen,
                    isOfflineAvailable: true,
                    appState: appState,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const ExerciseRecommendationScreen(),
                        ),
                      );
                    },
                    ),
                  ),
                  
                  // 错题分析
                  TourService.buildShowcase(
                    key: TourService.mistakeAnalysisKey,
                    title: '错题分析',
                    description: '智能分析学生错题模式\n帮助找出知识薄弱点并提供针对性建议',
                    child: _buildFeatureCard(
                    context,
                    title: '错题分析',
                    description: '智能分析学生错题，找出知识薄弱点',
                    icon: CupertinoIcons.chart_bar,
                    color: AppTheme.systemOrange,
                    isOfflineAvailable: true,
                    appState: appState,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const MistakeAnalysisScreen(),
                        ),
                      );
                    },
                    ),
                  ),
                  
                  // 已保存教案
                  TourService.buildShowcase(
                    key: TourService.savedLessonsKey,
                    title: '已保存教案',
                    description: '管理和查看您保存的教案\n支持搜索、筛选和编辑功能',
                    child: _buildFeatureCard(
                      context,
                      title: '已保存教案',
                      description: '管理和查看您保存的教案',
                      icon: CupertinoIcons.folder,
                      color: AppTheme.systemPurple,
                      isOfflineAvailable: true,
                      appState: appState,
                      isDark: isDark,
                      onTap: () {
                        Navigator.push(
                          context,
                          CupertinoPageRoute(
                            builder: (context) => const SavedLessonsScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                  
                  // 纸质资料数字化
                  TourService.buildShowcase(
                    key: TourService.documentScanKey,
                    title: '纸质资料数字化',
                    description: '使用OCR技术将纸质资料转为电子版\n支持文字识别和格式化处理',
                    child: _buildFeatureCard(
                    context,
                    title: '纸质资料数字化',
                    description: '拍照将纸质资料转为电子版',
                    icon: CupertinoIcons.doc_text_viewfinder,
                      color: AppTheme.systemTeal,
                    isOfflineAvailable: true,
                    appState: appState,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        CupertinoPageRoute(
                          builder: (context) => const DocumentScanScreen(),
                        ),
                      );
                    },
                    ),
                  ),
            ],
    );
  }
  
  Widget _buildFeatureCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required bool isOfflineAvailable,
    required AppState appState,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final isDisabled = appState.isOfflineMode && !isOfflineAvailable;
    
    return GestureDetector(
        onTap: isDisabled ? null : onTap,
      child: Container(
        decoration: AppTheme.iosCardDecoration(isDark: isDark),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isDisabled 
                      ? AppTheme.systemGray5 
                      : color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                icon,
                  size: 24,
                color: isDisabled 
                      ? AppTheme.systemGray 
                      : color,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: isDisabled 
                      ? AppTheme.systemGray 
                      : (isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor),
                ),
              ),
              const SizedBox(height: 4),
              Expanded(
                child: Text(
                description,
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 13,
                  color: isDisabled 
                        ? AppTheme.systemGray 
                        : AppTheme.systemGray,
                  ),
                ),
              ),
              if (isDisabled)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.systemGray5,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '离线不可用',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 11,
                      color: AppTheme.systemGray,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildOfflineModelStatus(BuildContext context, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.iosCardDecoration(isDark: isDark),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
        children: [
          Icon(
                CupertinoIcons.info_circle,
                color: AppTheme.systemBlue,
                size: 20,
          ),
              const SizedBox(width: 8),
                Text(
                '离线模型状态',
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  ),
              ),
            ],
                ),
          const SizedBox(height: 12),
          _buildStatusItem(
            context,
            '教案生成模型',
            '已下载',
            AppTheme.systemGreen,
            CupertinoIcons.checkmark_circle_fill,
          ),
          const SizedBox(height: 8),
          _buildStatusItem(
            context,
            '练习推荐模型',
            '已下载',
            AppTheme.systemGreen,
            CupertinoIcons.checkmark_circle_fill,
          ),
          const SizedBox(height: 8),
          _buildStatusItem(
            context,
            'OCR识别模型',
            '已下载',
            AppTheme.systemGreen,
            CupertinoIcons.checkmark_circle_fill,
                        ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: AppTheme.systemBlue,
              borderRadius: BorderRadius.circular(8),
              onPressed: () {
                _showModelManagementSheet(context);
              },
              child: const Text('管理离线模型'),
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _buildStatusItem(
    BuildContext context,
    String title,
    String status,
    Color statusColor,
    IconData statusIcon,
  ) {
    return Row(
      children: [
        Expanded(
                    child: Text(
            title,
            style: CupertinoTheme.of(context).textTheme.textStyle,
          ),
        ),
        Icon(
          statusIcon,
          color: statusColor,
          size: 16,
                      ),
        const SizedBox(width: 4),
        Text(
          status,
          style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
            color: statusColor,
            fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
    );
  }

  void _showModelManagementSheet(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('离线模型管理'),
        message: const Text('选择要执行的操作'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _showAlert(context, '检查更新', '所有模型都是最新版本');
            },
            child: const Text('检查模型更新'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _showAlert(context, '清理缓存', '模型缓存已清理完成');
            },
            child: const Text('清理模型缓存'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _showAlert(context, '重新下载', '开始重新下载所有模型...');
            },
            child: const Text('重新下载模型'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
                          ),
                        );
                      }

  void _showAlert(BuildContext context, String title, String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
            ),
        ],
      ),
    );
  }

  // 构建主题切换按钮
  Widget _buildThemeToggleButton(AppState appState) {
    final themeButton = CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () => appState.toggleThemeMode(),
      child: Icon(_getThemeIcon(appState.themeMode), color: AppTheme.primaryColor),
    );

    if (!_isButtonsVisible) {
      return themeButton;
    }

    try {
      return TourService.buildShowcase(
        key: TourService.themeToggleKey,
        title: '主题切换',
        description: '点击这里可以切换应用的主题模式\n支持浅色、深色和跟随系统三种模式',
        child: themeButton,
      );
    } catch (e) {
      print('Failed to build theme toggle showcase: $e');
      return themeButton;
    }
  }

  // 构建离线模式开关
  Widget _buildOfflineModeButton(AppState appState) {
    final offlineButton = CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () => appState.toggleOfflineMode(),
      child: Icon(
        appState.isOfflineMode ? Icons.cloud_off : Icons.cloud,
        color: AppTheme.primaryColor,
      ),
    );

    if (!_isButtonsVisible) {
      return offlineButton;
    }

    try {
      return TourService.buildShowcase(
        key: TourService.offlineModeKey,
        title: '离线模式',
        description: '点击这里可以切换离线模式\n离线模式下将使用本地缓存数据',
        child: offlineButton,
      );
    } catch (e) {
      print('Failed to build offline mode showcase: $e');
      return offlineButton;
    }
  }

  IconData _getThemeIcon(ThemeMode themeMode) {
    switch (themeMode) {
      case ThemeMode.light:
        return CupertinoIcons.sun_max;
      case ThemeMode.dark:
        return CupertinoIcons.moon;
      case ThemeMode.system:
        return CupertinoIcons.device_phone_portrait;
    }
  }

  String _getThemeTooltip(ThemeMode themeMode) {
    switch (themeMode) {
      case ThemeMode.light:
        return '切换到深色模式';
      case ThemeMode.dark:
        return '切换到跟随系统';
      case ThemeMode.system:
        return '切换到浅色模式';
    }
  }

  // 修改Profile导航逻辑
  void _navigateToProfile() async {
    setState(() {
      _isButtonsVisible = false;
    });
    
    await Navigator.push(
      context,
      CupertinoPageRoute(builder: (context) => const UserProfileScreen()),
    );
    
    if (mounted) {
      setState(() {
        _isButtonsVisible = true;
      });
    }
  }
} 