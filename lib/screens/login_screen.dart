import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../utils/app_theme.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _displayNameController = TextEditingController();
  
  bool _isLogin = true;
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return CupertinoPageScaffold(
      backgroundColor: isDark ? AppTheme.systemBackgroundDark : AppTheme.systemBackground,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              
              // Logo和标题
              _buildHeader(isDark),
              
              const SizedBox(height: 48),
              
              // 登录/注册表单
              _buildForm(isDark),
              
              const SizedBox(height: 24),
              
              // 登录/注册按钮
              _buildActionButton(isDark),
              
              const SizedBox(height: 16),
              
              // 切换登录/注册
              _buildToggleButton(isDark),
              
              const SizedBox(height: 32),
              
              // 分割线
              _buildDivider(isDark),
              
              const SizedBox(height: 24),
              
              // 游客登录按钮
              _buildGuestButton(isDark),
              
              const SizedBox(height: 16),
              
              // 帮助文本
              _buildHelpText(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Column(
      children: [
        // Logo
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppTheme.systemBlue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            CupertinoIcons.book_circle,
            size: 48,
            color: AppTheme.systemBlue,
          ),
        ),
        
        const SizedBox(height: 24),
        
        // 标题
        Text(
          '毕节教师助手',
          style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle.copyWith(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 8),
        
        // 副标题
        Text(
          _isLogin ? '欢迎回来' : '创建新账户',
          style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
            color: AppTheme.systemGray,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildForm(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.secondarySystemBackgroundDark : AppTheme.secondarySystemBackground,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.iosShadow,
      ),
      child: Column(
        children: [
          // 用户名
          _buildTextField(
            controller: _usernameController,
            placeholder: '用户名或邮箱',
            icon: CupertinoIcons.person,
            isDark: isDark,
          ),
          
          if (!_isLogin) ...[
            const SizedBox(height: 16),
            // 邮箱（仅注册时显示）
            _buildTextField(
              controller: _emailController,
              placeholder: '邮箱地址',
              icon: CupertinoIcons.mail,
              isDark: isDark,
            ),
            
            const SizedBox(height: 16),
            // 显示名称（仅注册时显示）
            _buildTextField(
              controller: _displayNameController,
              placeholder: '显示名称',
              icon: CupertinoIcons.textformat,
              isDark: isDark,
            ),
          ],
          
          const SizedBox(height: 16),
          
          // 密码
          _buildTextField(
            controller: _passwordController,
            placeholder: '密码',
            icon: CupertinoIcons.lock,
            isPassword: true,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String placeholder,
    required IconData icon,
    bool isPassword = false,
    required bool isDark,
  }) {
    return CupertinoTextField(
      controller: controller,
      placeholder: placeholder,
      obscureText: isPassword ? _obscurePassword : false,
      prefix: Padding(
        padding: const EdgeInsets.only(left: 12, right: 8),
        child: Icon(
          icon,
          color: AppTheme.systemGray,
          size: 20,
        ),
      ),
      suffix: isPassword
          ? CupertinoButton(
              padding: const EdgeInsets.only(right: 12),
              minSize: 0,
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
              child: Icon(
                _obscurePassword ? CupertinoIcons.eye : CupertinoIcons.eye_slash,
                color: AppTheme.systemGray,
                size: 20,
              ),
            )
          : null,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
          width: 0.5,
        ),
      ),
    );
  }

  Widget _buildActionButton(bool isDark) {
    return CupertinoButton(
      color: AppTheme.systemBlue,
      borderRadius: BorderRadius.circular(12),
      onPressed: _isLoading ? null : _handleAction,
      child: _isLoading
          ? const CupertinoActivityIndicator(color: Colors.white)
          : Text(
              _isLogin ? '登录' : '注册',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
    );
  }

  Widget _buildToggleButton(bool isDark) {
    return CupertinoButton(
      onPressed: () {
        setState(() {
          _isLogin = !_isLogin;
          _clearForm();
        });
      },
      child: RichText(
        text: TextSpan(
          style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
            color: AppTheme.systemGray,
          ),
          children: [
            TextSpan(
              text: _isLogin ? '还没有账户？' : '已有账户？',
            ),
            TextSpan(
              text: _isLogin ? '立即注册' : '立即登录',
              style: const TextStyle(
                color: AppTheme.systemBlue,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 0.5,
            color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            '或',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              color: AppTheme.systemGray,
            ),
          ),
        ),
        Expanded(
          child: Container(
            height: 0.5,
            color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
          ),
        ),
      ],
    );
  }

  Widget _buildGuestButton(bool isDark) {
    return CupertinoButton(
      color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray6,
      borderRadius: BorderRadius.circular(12),
      onPressed: _isLoading ? null : _handleGuestLogin,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.person_2,
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            '游客模式',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpText(bool isDark) {
    return Text(
      '游客模式下可以体验所有功能\n但数据不会被保存',
      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
        color: AppTheme.systemGray,
        fontSize: 12,
      ),
      textAlign: TextAlign.center,
    );
  }

  void _clearForm() {
    _usernameController.clear();
    _passwordController.clear();
    _emailController.clear();
    _displayNameController.clear();
  }

  Future<void> _handleAction() async {
    if (_isLoading) return;

    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      _showAlert('请填写完整信息');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      AuthResult result;
      
      if (_isLogin) {
        result = await AuthService.login(
          username: username,
          password: password,
        );
      } else {
        final email = _emailController.text.trim();
        final displayName = _displayNameController.text.trim();

        if (email.isEmpty || displayName.isEmpty) {
          _showAlert('请填写完整信息');
          return;
        }

        result = await AuthService.register(
          username: username,
          email: email,
          password: password,
          displayName: displayName,
        );
      }

      if (result.isSuccess) {
        _navigateToHome();
      } else {
        _showAlert(result.error ?? '操作失败');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleGuestLogin() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await AuthService.guestLogin();
      if (result.isSuccess) {
        _navigateToHome();
      } else {
        _showAlert(result.error ?? '游客登录失败');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _navigateToHome() {
    Navigator.pushReplacement(
      context,
      CupertinoPageRoute(
        builder: (context) => const HomeScreen(),
      ),
    );
  }

  void _showAlert(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('提示'),
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