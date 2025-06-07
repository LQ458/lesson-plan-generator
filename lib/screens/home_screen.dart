import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:showcaseview/showcaseview.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/screens/document_scan_screen.dart';
import 'package:teachai_app/screens/exercise_recommendation_screen.dart';
import 'package:teachai_app/screens/lesson_plan_screen.dart';
import 'package:teachai_app/screens/mistake_analysis_screen.dart';
import 'package:teachai_app/services/auth_service.dart';
import 'package:teachai_app/services/tour_service.dart';
import 'package:teachai_app/screens/user_profile_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // 检查并显示引导
    WidgetsBinding.instance.addPostFrameCallback((_) {
      TourService.checkAndShowTour(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('毕节教师助手'),
        leading: TourService.buildShowcase(
          key: TourService.profileKey,
          title: '个人中心',
          description: '查看和管理您的个人信息\n设置偏好、查看使用统计等',
          child: CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () {
              Navigator.push(
                context,
                CupertinoPageRoute(
                  builder: (context) => const UserProfileScreen(),
                ),
              );
            },
            child: Icon(
              CupertinoIcons.person_circle,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 主题切换按钮
            TourService.buildShowcase(
              key: TourService.themeToggleKey,
              title: '主题切换',
              description: '点击这里可以切换应用的主题模式\n支持浅色、深色和跟随系统三种模式',
              child: CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  appState.toggleThemeMode();
                },
                child: Icon(
                  _getThemeIcon(appState.themeMode),
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
            const SizedBox(width: 8),
            // 离线模式开关
            TourService.buildShowcase(
              key: TourService.offlineModeKey,
              title: '离线模式',
              description: '开启离线模式后，应用将使用本地AI模型\n无需网络连接即可使用核心功能',
              child: CupertinoSwitch(
                value: appState.isOfflineMode,
                onChanged: (value) {
                  appState.toggleOfflineMode();
                },
              ),
            ),
            const SizedBox(width: 8),
            // Tour测试按钮（调试用）
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () {
                TourService.forceShowTour(context);
              },
              child: const Icon(
                CupertinoIcons.question_circle,
                color: AppTheme.systemBlue,
              ),
            ),
        ],
        ),
      ),
      child: SafeArea(
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
              _buildFeatureGrid(context, appState, isDark),
              
              const SizedBox(height: 24),
              
              // 离线模型状态
              _buildOfflineModelStatus(context, isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureGrid(BuildContext context, AppState appState, bool isDark) {
    return GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
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
                      color: AppTheme.systemPurple,
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
} 