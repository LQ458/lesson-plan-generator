"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface UserSettings {
  gradeLevel: string;
  subject: string;
  autoSave: boolean;
  easyMode: boolean;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  gradeLevel: "primary_1",
  subject: "chinese",
  autoSave: true,
  easyMode: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // 从用户会话和localStorage加载设置
  useEffect(() => {
    const loadSettings = async () => {
      let sessionPreferences = null;

      try {
        // 首先尝试从用户会话获取偏好
        const sessionResponse = await fetch("/api/auth/verify", {
          credentials: "include",
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.session?.preferences) {
            const preferences = sessionData.session.preferences;
            sessionPreferences = {
              subject: preferences.subject,
              gradeLevel: preferences.gradeLevel,
              easyMode: preferences.easyMode,
            };
            console.log("从用户会话加载偏好设置:", sessionPreferences);
          }
        } else {
          console.log("用户未登录，将使用本地设置");
        }
      } catch (error) {
        console.log(
          "无法获取用户会话，将使用本地设置:",
          error instanceof Error ? error.message : String(error),
        );
      }

      // 从localStorage获取本地设置
      let localSettings = null;
      try {
        const saved = localStorage.getItem("teachai-settings");
        if (saved) {
          localSettings = JSON.parse(saved);
          console.log("从本地存储加载设置:", localSettings);
        }
      } catch (error) {
        console.error("解析本地设置失败:", error);
      }

      // 合并设置：会话偏好 > 本地设置 > 默认设置
      const mergedSettings = {
        ...defaultSettings,
        ...(localSettings || {}),
        ...(sessionPreferences || {}),
      };

      console.log("最终合并的设置:", mergedSettings);
      setSettings(mergedSettings);
      setMounted(true);
    };

    loadSettings();
  }, []);

  // 自动保存设置到 localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("teachai-settings", JSON.stringify(settings));
    }
  }, [settings, mounted]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// 辅助函数：获取年级和科目的中文标签
export const getGradeLevelLabel = (value: string) => {
  const gradeMap: Record<string, string> = {
    primary_1: "小学一年级",
    primary_2: "小学二年级",
    primary_3: "小学三年级",
    primary_4: "小学四年级",
    primary_5: "小学五年级",
    primary_6: "小学六年级",
    junior_1: "初中一年级",
    junior_2: "初中二年级",
    junior_3: "初中三年级",
  };
  return gradeMap[value] || value;
};

export const getSubjectLabel = (value: string) => {
  const subjectMap: Record<string, string> = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    physics: "物理",
    chemistry: "化学",
    biology: "生物",
    history: "历史",
    geography: "地理",
    politics: "政治",
    music: "音乐",
    art: "美术",
    pe: "体育",
  };
  return subjectMap[value] || value;
};
