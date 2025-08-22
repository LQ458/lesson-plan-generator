"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSettings } from "@/lib/settings-context";
import {
  AcademicCapIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载后再渲染主题相关内容
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;

    updateSettings({
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const gradeLevels = [
    { value: "小学一年级", label: "小学一年级" },
    { value: "小学二年级", label: "小学二年级" },
    { value: "小学三年级", label: "小学三年级" },
    { value: "小学四年级", label: "小学四年级" },
    { value: "小学五年级", label: "小学五年级" },
    { value: "小学六年级", label: "小学六年级" },
    { value: "初中一年级", label: "初中一年级" },
    { value: "初中二年级", label: "初中二年级" },
    { value: "初中三年级", label: "初中三年级" },
  ];

  const subjects = [
    { value: "语文", label: "语文" },
    { value: "数学", label: "数学" },
    { value: "英语", label: "英语" },
    { value: "物理", label: "物理" },
    { value: "化学", label: "化学" },
    { value: "生物", label: "生物" },
    { value: "历史", label: "历史" },
    { value: "地理", label: "地理" },
    { value: "政治", label: "政治" },
    { value: "音乐", label: "音乐" },
    { value: "美术", label: "美术" },
    { value: "体育", label: "体育" },
  ];

  const themeOptions = [
    { value: "light", label: "浅色模式", icon: SunIcon },
    { value: "dark", label: "深色模式", icon: MoonIcon },
    { value: "system", label: "跟随系统", icon: ComputerDesktopIcon },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-apple-green/10 rounded-3xl">
              <AcademicCapIcon className="w-12 h-12 text-apple-green" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">教学偏好设置</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            设置您的教学信息，让AI更好地为您服务
          </p>
        </div>

        <div className="space-y-8">
          {/* Teaching Info */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <BookOpenIcon className="w-6 h-6 text-apple-blue" />
              教学信息
            </h2>

            <div className="space-y-6">
              {/* Grade Level */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  主要教学阶段
                </label>
                <select
                  name="gradeLevel"
                  value={settings.gradeLevel}
                  onChange={handleInputChange}
                  className="input text-lg"
                >
                  {gradeLevels.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  主要教学科目
                </label>
                <select
                  name="subject"
                  value={settings.subject}
                  onChange={handleInputChange}
                  className="input text-lg"
                >
                  {subjects.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* App Preferences */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <SunIcon className="w-6 h-6 text-apple-orange" />
              使用偏好
            </h2>

            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  界面主题
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themeOptions.map((themeOption) => {
                    const Icon = themeOption.icon;
                    const isSelected = mounted && theme === themeOption.value;
                    return (
                      <label
                        key={themeOption.value}
                        className={`card p-4 cursor-pointer text-center transition-all ${
                          isSelected
                            ? "ring-2 ring-apple-blue bg-apple-blue/5"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                        onClick={() => handleThemeChange(themeOption.value)}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" />
                        <span className="text-sm font-medium">
                          {themeOption.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Switches */}
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium">自动保存教案</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      生成教案后自动保存到本地
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="autoSave"
                    checked={settings.autoSave}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-apple-blue rounded focus:ring-apple-blue"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium">简易模式</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      使用更简单的界面和更少的选项
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="easyMode"
                    checked={settings.easyMode}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-apple-blue rounded focus:ring-apple-blue"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              ✅ 设置已自动保存 · 您的设置信息仅保存在本设备上，不会上传到互联网
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
