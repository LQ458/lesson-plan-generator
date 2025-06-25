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
  gradeLevel: "小学一年级",
  subject: "语文",
  autoSave: true,
  easyMode: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // 从 localStorage 加载设置
  useEffect(() => {
    const saved = localStorage.getItem("teachai-settings");
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }
    setMounted(true);
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
  // 现在直接返回值，因为设置中已经是中文
  return value;
};

export const getSubjectLabel = (value: string) => {
  // 现在直接返回值，因为设置中已经是中文
  return value;
};
