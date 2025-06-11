import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // iOS风格品牌色
  static const Color primaryColor = Color(0xFF007AFF); // iOS蓝色
  static const Color secondaryColor = Color(0xFF34C759); // iOS绿色
  static const Color accentColor = Color(0xFFFF9500); // iOS橙色

  // iOS系统色
  static const Color systemBlue = Color(0xFF007AFF);
  static const Color systemGreen = Color(0xFF34C759);
  static const Color systemIndigo = Color(0xFF5856D6);
  static const Color systemOrange = Color(0xFFFF9500);
  static const Color systemPink = Color(0xFFFF2D92);
  static const Color systemPurple = Color(0xFFAF52DE);
  static const Color systemRed = Color(0xFFFF3B30);
  static const Color systemTeal = Color(0xFF5AC8FA);
  static const Color systemYellow = Color(0xFFFFCC00);

  // iOS灰色系
  static const Color systemGray = Color(0xFF8E8E93);
  static const Color systemGray2 = Color(0xFFAEAEB2);
  static const Color systemGray3 = Color(0xFFC7C7CC);
  static const Color systemGray4 = Color(0xFFD1D1D6);
  static const Color systemGray5 = Color(0xFFE5E5EA);
  static const Color systemGray6 = Color(0xFFF2F2F7);

  // iOS背景色
  static const Color systemBackground = Color(0xFFFFFFFF);
  static const Color secondarySystemBackground = Color(0xFFF2F2F7);
  static const Color tertiarySystemBackground = Color(0xFFFFFFFF);

  // iOS深色背景色
  static const Color systemBackgroundDark = Color(0xFF000000);
  static const Color secondarySystemBackgroundDark = Color(0xFF1C1C1E);
  static const Color tertiarySystemBackgroundDark = Color(0xFF2C2C2E);

  // 功能色
  static const Color successColor = systemGreen;
  static const Color warningColor = systemOrange;
  static const Color errorColor = systemRed;
  static const Color infoColor = systemBlue;

  // 中性色
  static const Color backgroundColor = systemBackground;
  static const Color surfaceColor = Colors.white;
  static const Color textPrimaryColor = Color(0xFF000000);
  static const Color textSecondaryColor = systemGray;
  static const Color secondaryText = systemGray; // 添加secondaryText别名
  static const Color dividerColor = systemGray4;

  // 深色主题色
  static const Color darkBackgroundColor = systemBackgroundDark;
  static const Color darkSurfaceColor = secondarySystemBackgroundDark;
  static const Color darkTextPrimaryColor = Color(0xFFFFFFFF);
  static const Color darkTextSecondaryColor = systemGray2;

  // iOS风格阴影
  static List<BoxShadow> iosShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.1),
      blurRadius: 10,
      offset: const Offset(0, 2),
    ),
  ];

  // 获取Cupertino主题
  static CupertinoThemeData getCupertinoTheme({required bool isDark}) {
    return CupertinoThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: systemBlue,
      primaryContrastingColor: isDark ? darkTextPrimaryColor : textPrimaryColor,
      scaffoldBackgroundColor: isDark ? systemBackgroundDark : systemBackground,
      textTheme: CupertinoTextThemeData(
        textStyle: TextStyle(
          inherit: false, // 确保inherit为false，避免插值冲突
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 17.0,
          letterSpacing: -0.4,
          decoration: TextDecoration.none,
        ),
        actionTextStyle: TextStyle(
          inherit: false,
          color: systemBlue,
          fontFamily: 'CupertinoSystemText',
          fontSize: 17.0,
          letterSpacing: -0.4,
          decoration: TextDecoration.none,
        ),
        tabLabelTextStyle: TextStyle(
          inherit: false,
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 10.0,
          letterSpacing: -0.24,
          decoration: TextDecoration.none,
        ),
        navTitleTextStyle: TextStyle(
          inherit: false,
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 17.0,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.4,
          decoration: TextDecoration.none,
        ),
        navLargeTitleTextStyle: TextStyle(
          inherit: false,
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 34.0,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
          decoration: TextDecoration.none,
        ),
        navActionTextStyle: TextStyle(
          inherit: false,
          color: systemBlue,
          fontFamily: 'CupertinoSystemText',
          fontSize: 17.0,
          letterSpacing: -0.4,
          decoration: TextDecoration.none,
        ),
        pickerTextStyle: TextStyle(
          inherit: false,
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 21.0,
          fontWeight: FontWeight.w400,
          letterSpacing: -0.6,
          decoration: TextDecoration.none,
        ),
        dateTimePickerTextStyle: TextStyle(
          inherit: false,
          color: isDark ? darkTextPrimaryColor : textPrimaryColor,
          fontFamily: 'CupertinoSystemText',
          fontSize: 21.0,
          fontWeight: FontWeight.w400,
          letterSpacing: -0.6,
          decoration: TextDecoration.none,
        ),
      ),
      barBackgroundColor: isDark ? secondarySystemBackgroundDark : secondarySystemBackground,
    );
  }

  // 亮色主题（保留Material Design兼容性）
  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: primaryColor,
      secondary: secondaryColor,
      tertiary: accentColor,
      background: backgroundColor,
      surface: surfaceColor,
      error: errorColor,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: textPrimaryColor,
      onBackground: textPrimaryColor,
    ),
    scaffoldBackgroundColor: backgroundColor,
    textTheme: GoogleFonts.notoSansTextTheme(ThemeData.light().textTheme.copyWith(
      displayLarge: const TextStyle(color: textPrimaryColor),
      displayMedium: const TextStyle(color: textPrimaryColor),
      displaySmall: const TextStyle(color: textPrimaryColor),
      headlineLarge: const TextStyle(color: textPrimaryColor),
      headlineMedium: const TextStyle(color: textPrimaryColor),
      headlineSmall: const TextStyle(color: textPrimaryColor),
      titleLarge: const TextStyle(color: textPrimaryColor),
      titleMedium: const TextStyle(color: textPrimaryColor),
      titleSmall: const TextStyle(color: textPrimaryColor),
      bodyLarge: const TextStyle(color: textPrimaryColor),
      bodyMedium: const TextStyle(color: textPrimaryColor),
      bodySmall: const TextStyle(color: textPrimaryColor),
      labelLarge: const TextStyle(color: textPrimaryColor),
      labelMedium: const TextStyle(color: textPrimaryColor),
      labelSmall: const TextStyle(color: textPrimaryColor),
    )),
    appBarTheme: const AppBarTheme(
      backgroundColor: primaryColor,
      foregroundColor: Colors.white,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w500,
      ),
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: surfaceColor,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 2,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primaryColor,
        side: const BorderSide(color: primaryColor),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryColor,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryColor,
      foregroundColor: Colors.white,
    ),
    dividerTheme: const DividerThemeData(
      color: dividerColor,
      thickness: 1,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: dividerColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: dividerColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: primaryColor),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: errorColor),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );

  // 深色主题（保留Material Design兼容性）
  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.dark(
      primary: primaryColor,
      secondary: secondaryColor,
      tertiary: accentColor,
      background: darkBackgroundColor,
      surface: darkSurfaceColor,
      error: errorColor,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Colors.white,
      onBackground: Colors.white,
    ),
    scaffoldBackgroundColor: darkBackgroundColor,
    textTheme: GoogleFonts.notoSansTextTheme(ThemeData.dark().textTheme.copyWith(
      displayLarge: const TextStyle(color: Colors.white),
      displayMedium: const TextStyle(color: Colors.white),
      displaySmall: const TextStyle(color: Colors.white),
      headlineLarge: const TextStyle(color: Colors.white),
      headlineMedium: const TextStyle(color: Colors.white),
      headlineSmall: const TextStyle(color: Colors.white),
      titleLarge: const TextStyle(color: Colors.white),
      titleMedium: const TextStyle(color: Colors.white),
      titleSmall: const TextStyle(color: Colors.white),
      bodyLarge: const TextStyle(color: Colors.white),
      bodyMedium: const TextStyle(color: Colors.white),
      bodySmall: const TextStyle(color: Colors.white),
      labelLarge: const TextStyle(color: Colors.white),
      labelMedium: const TextStyle(color: Colors.white),
      labelSmall: const TextStyle(color: Colors.white),
    )),
    appBarTheme: const AppBarTheme(
      backgroundColor: darkBackgroundColor,
      foregroundColor: Colors.white,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w500,
      ),
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: darkSurfaceColor,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 2,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primaryColor,
        side: const BorderSide(color: primaryColor),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryColor,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryColor,
      foregroundColor: Colors.white,
    ),
    dividerTheme: const DividerThemeData(
      color: systemGray3,
      thickness: 1,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkSurfaceColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: systemGray3),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: systemGray3),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: primaryColor),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: errorColor),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );

  // iOS风格按钮样式
  static BoxDecoration iosButtonDecoration({
    required Color color,
    bool isPressed = false,
  }) {
    return BoxDecoration(
      color: isPressed ? color.withOpacity(0.8) : color,
      borderRadius: BorderRadius.circular(8),
      boxShadow: isPressed ? [] : iosShadow,
    );
  }

  // iOS风格卡片装饰
  static BoxDecoration iosCardDecoration({
    required bool isDark,
  }) {
    return BoxDecoration(
      color: isDark ? darkSurfaceColor : surfaceColor,
      borderRadius: BorderRadius.circular(12),
      boxShadow: iosShadow,
    );
  }
} 