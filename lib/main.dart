import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:showcaseview/showcaseview.dart';
import 'package:loader_overlay/loader_overlay.dart';

import 'package:teachai_app/screens/home_screen.dart';
import 'package:teachai_app/screens/login_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/models/user.dart';
import 'package:teachai_app/services/data_service.dart';
import 'package:teachai_app/services/auth_service.dart';
import 'package:teachai_app/services/tour_service.dart';
import 'package:teachai_app/config/env_loader.dart';


final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 重置TourService的GlobalKey以避免冲突
  TourService.resetKeys();
  
  // 初始化环境变量
  await EnvLoader.initialize();
  
  // 初始化Hive本地数据库
  await Hive.initFlutter();
  
  // 注册Hive适配器
  Hive.registerAdapter(UserAdapter());
  
  // 初始化数据服务（包含适配器注册和示例数据生成）
  await DataService.init();
  
  // 初始化认证服务
  await AuthService.init();
  
  runApp(
    ChangeNotifierProvider(
      create: (context) => AppState(),
      child: const TeachAIApp(),
    ),
  );
}

class TeachAIApp extends StatelessWidget {
  const TeachAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return GlobalLoaderOverlay(
          useDefaultLoading: false,
          overlayWidgetBuilder: (progress) {
            final isDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
            return Container(
              color: (isDark ? Colors.black : Colors.white).withOpacity(0.8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: isDark 
                        ? AppTheme.secondarySystemBackgroundDark.withOpacity(0.95)
                        : AppTheme.systemBackground.withOpacity(0.95),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
                        blurRadius: 20,
                        spreadRadius: 0,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CupertinoActivityIndicator(
                        radius: 16,
                        color: AppTheme.systemBlue,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        progress ?? '正在加载...',
                        style: TextStyle(
                          color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
                          fontSize: 17,
                          fontWeight: FontWeight.w400,
                          letterSpacing: -0.4,
                          fontFamily: 'CupertinoSystemText',
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
          child: ShowCaseWidget(
            onStart: (index, key) {
              print('Tour started: step $index');
            },
            onComplete: (index, key) {
              print('Tour step completed: $index');
            },
            onFinish: () {
              print('Tour finished');
              // 显示引导完成对话框
              WidgetsBinding.instance.addPostFrameCallback((_) {
                final context = navigatorKey.currentContext;
                if (context != null) {
                  TourService.showTourCompleteDialog(context);
                }
              });
            },
          builder: (context) => CupertinoApp(
                navigatorKey: navigatorKey,
              title: 'TeachAI - 毕节教师助手',
              theme: AppTheme.getCupertinoTheme(
                isDark: appState.themeMode == ThemeMode.dark || 
                       (appState.themeMode == ThemeMode.system && 
                        MediaQuery.platformBrightnessOf(context) == Brightness.dark),
              ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('zh', 'CN'),
                Locale('en', 'US'),
      ],
              home: AuthService.isLoggedIn ? const HomeScreen() : const LoginScreen(),
              debugShowCheckedModeBanner: false,
              ),
            ),
        );
      },
    );
  }
} 