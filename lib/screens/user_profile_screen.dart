import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../services/auth_service.dart';
import '../services/tour_service.dart';
import '../utils/app_theme.dart';
import 'login_screen.dart';

class UserProfileScreen extends StatefulWidget {
  const UserProfileScreen({super.key});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final currentUser = AuthService.currentUser;
    
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('个人中心'),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // 用户信息卡片
              _buildUserInfoCard(currentUser, isDark),
              
              const SizedBox(height: 24),
              
              // 设置选项
              _buildSettingsSection(isDark),
              
              const SizedBox(height: 24),
              
              // 帮助和支持
              _buildHelpSection(isDark),
              
              const SizedBox(height: 24),
              
              // 登出按钮
              _buildLogoutButton(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserInfoCard(user, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.iosCardDecoration(isDark: isDark),
      child: Column(
        children: [
          // 头像
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.systemBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(
              CupertinoIcons.person_circle,
              size: 60,
              color: AppTheme.systemBlue,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 用户名
          Text(
            user?.displayName ?? '未知用户',
            style: CupertinoTheme.of(context).textTheme.navTitleTextStyle.copyWith(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 4),
          
          // 邮箱
          Text(
            user?.email ?? '',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              color: AppTheme.systemGray,
            ),
          ),
          
          const SizedBox(height: 8),
          
          // 角色标签
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _getRoleColor(user?.role).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _getRoleText(user?.role),
              style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                color: _getRoleColor(user?.role),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection(bool isDark) {
    return Container(
      decoration: AppTheme.iosCardDecoration(isDark: isDark),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '设置',
              style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
            ),
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.paintbrush,
            title: '主题设置',
            subtitle: '切换应用主题',
            onTap: () => _showThemeSelector(),
            isDark: isDark,
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.bell,
            title: '通知设置',
            subtitle: '管理推送通知',
            onTap: () => _showNotificationSettings(),
            isDark: isDark,
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.lock,
            title: '隐私设置',
            subtitle: '数据和隐私管理',
            onTap: () => _showPrivacySettings(),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildHelpSection(bool isDark) {
    return Container(
      decoration: AppTheme.iosCardDecoration(isDark: isDark),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '帮助与支持',
              style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
            ),
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.question_circle,
            title: '功能引导',
            subtitle: '重新查看应用引导',
            onTap: () => TourService.restartTour(context),
            isDark: isDark,
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.book,
            title: '使用帮助',
            subtitle: '查看使用说明',
            onTap: () => _showHelp(),
            isDark: isDark,
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.chat_bubble,
            title: '意见反馈',
            subtitle: '提交问题和建议',
            onTap: () => _showFeedback(),
            isDark: isDark,
          ),
          
          _buildSettingItem(
            icon: CupertinoIcons.info_circle,
            title: '关于应用',
            subtitle: '版本信息和开发者',
            onTap: () => _showAbout(),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
    Widget? trailing,
    required bool isDark,
  }) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
              width: 0.5,
            ),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.systemBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: AppTheme.systemBlue,
                size: 18,
              ),
            ),
            
            const SizedBox(width: 12),
            
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 12,
                      color: AppTheme.systemGray,
                    ),
                  ),
                ],
              ),
            ),
            
            trailing ?? Icon(
              CupertinoIcons.chevron_right,
              color: AppTheme.systemGray,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoutButton(bool isDark) {
    return SizedBox(
      width: double.infinity,
      child: CupertinoButton(
        color: AppTheme.systemRed,
        borderRadius: BorderRadius.circular(12),
        onPressed: _handleLogout,
        child: const Text(
          '退出登录',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Color _getRoleColor(String? role) {
    switch (role) {
      case 'admin':
        return AppTheme.systemRed;
      case 'teacher':
        return AppTheme.systemBlue;
      case 'student':
        return AppTheme.systemGreen;
      case 'guest':
        return AppTheme.systemGray;
      default:
        return AppTheme.systemGray;
    }
  }

  String _getRoleText(String? role) {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'teacher':
        return '教师';
      case 'student':
        return '学生';
      case 'guest':
        return '游客';
      default:
        return '未知';
    }
  }

  void _showThemeSelector() {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择主题'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Provider.of<AppState>(context, listen: false).setThemeMode(ThemeMode.light);
              Navigator.pop(context);
            },
            child: const Text('浅色模式'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Provider.of<AppState>(context, listen: false).setThemeMode(ThemeMode.dark);
              Navigator.pop(context);
            },
            child: const Text('深色模式'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Provider.of<AppState>(context, listen: false).setThemeMode(ThemeMode.system);
              Navigator.pop(context);
            },
            child: const Text('跟随系统'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showNotificationSettings() {
    _showAlert('通知设置', '通知设置功能开发中...');
  }

  void _showPrivacySettings() {
    _showAlert('隐私设置', '隐私设置功能开发中...');
  }

  void _showHelp() {
    _showAlert('使用帮助', '使用帮助功能开发中...');
  }

  void _showFeedback() {
    _showAlert('意见反馈', '意见反馈功能开发中...');
  }

  void _showAbout() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('关于应用'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 12),
            Text('毕节教师助手'),
            SizedBox(height: 8),
            Text('版本: 2.0.0'),
            SizedBox(height: 8),
            Text('一款专为教师设计的AI辅助工具'),
          ],
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _handleLogout() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('确认退出'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            onPressed: () async {
              Navigator.pop(context);
              await AuthService.logout();
              if (mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  CupertinoPageRoute(
                    builder: (context) => const LoginScreen(),
                  ),
                  (route) => false,
                );
              }
            },
            child: const Text('退出'),
          ),
        ],
      ),
    );
  }

  void _showAlert(String title, String message) {
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
} 