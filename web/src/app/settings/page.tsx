"use client";

import { useState } from "react";
import {
  Cog6ToothIcon,
  KeyIcon,
  PaintBrushIcon,
  BellIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    apiKey: "",
    apiProvider: "openai",
    model: "gpt-3.5-turbo",
    temperature: "0.7",
    maxTokens: "2000",
    language: "zh-CN",
    autoSave: true,
    notifications: true,
    darkMode: "system",
  });

  const [saved, setSaved] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("teachai-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const apiProviders = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "google", label: "Google AI" },
    { value: "local", label: "本地模型" },
  ];

  const models = {
    openai: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
    anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    google: ["gemini-pro", "gemini-pro-vision"],
    local: ["llama2", "chatglm", "baichuan"],
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-apple-purple/10 rounded-3xl">
              <Cog6ToothIcon className="w-12 h-12 text-apple-purple" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">应用设置</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            配置AI模型、界面主题和其他应用偏好设置
          </p>
        </div>

        <div className="space-y-8">
          {/* API Configuration */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <KeyIcon className="w-6 h-6 text-apple-blue" />
              AI模型配置
            </h2>

            <div className="space-y-6">
              {/* API Provider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  API提供商
                </label>
                <select
                  name="apiProvider"
                  value={settings.apiProvider}
                  onChange={handleInputChange}
                  className="input"
                >
                  {apiProviders.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  API密钥
                </label>
                <input
                  type="password"
                  name="apiKey"
                  value={settings.apiKey}
                  onChange={handleInputChange}
                  placeholder="请输入您的API密钥"
                  className="input"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  您的API密钥将安全存储在本地，不会上传到服务器
                </p>
              </div>

              {/* Model Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    模型选择
                  </label>
                  <select
                    name="model"
                    value={settings.model}
                    onChange={handleInputChange}
                    className="input"
                  >
                    {models[settings.apiProvider as keyof typeof models]?.map(
                      (model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    创造性 (Temperature)
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    value={settings.temperature}
                    onChange={handleInputChange}
                    min="0"
                    max="2"
                    step="0.1"
                    className="input"
                  />
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  最大输出长度 (Tokens)
                </label>
                <input
                  type="number"
                  name="maxTokens"
                  value={settings.maxTokens}
                  onChange={handleInputChange}
                  min="100"
                  max="4000"
                  step="100"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Interface Settings */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <PaintBrushIcon className="w-6 h-6 text-apple-green" />
              界面设置
            </h2>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  界面语言
                </label>
                <select
                  name="language"
                  value={settings.language}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>

              {/* Dark Mode */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  主题模式
                </label>
                <select
                  name="darkMode"
                  value={settings.darkMode}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="light">浅色模式</option>
                  <option value="dark">深色模式</option>
                  <option value="system">跟随系统</option>
                </select>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <ShieldCheckIcon className="w-6 h-6 text-apple-orange" />
              应用偏好
            </h2>

            <div className="space-y-6">
              {/* Auto Save */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">自动保存</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    自动保存生成的内容到本地
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="autoSave"
                  checked={settings.autoSave}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-apple-blue bg-gray-100 border-gray-300 rounded focus:ring-apple-blue dark:focus:ring-apple-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">桌面通知</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    在生成完成时显示桌面通知
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="notifications"
                  checked={settings.notifications}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-apple-blue bg-gray-100 border-gray-300 rounded focus:ring-apple-blue dark:focus:ring-apple-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              className="btn btn-primary text-lg px-8 py-4 flex items-center gap-3"
            >
              {saved ? (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  已保存
                </>
              ) : (
                <>
                  <Cog6ToothIcon className="w-5 h-5" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
