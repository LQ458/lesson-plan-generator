"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserPlusIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";

type Step = "invite" | "auth" | "login";

interface UserPreferences {
  subject: string;
  gradeLevel: string;
  easyMode: boolean;
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasLetter: false,
    hasNumber: false,
  });

  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    subject: "math",
    gradeLevel: "primary_1",
    easyMode: true,
  });

  const router = useRouter();

  // Password validation
  const validatePassword = (password: string) => {
    const validation = {
      length: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
    };
    setPasswordValidation(validation);
    return validation.length && validation.hasLetter && validation.hasNumber;
  };

  const handlePasswordChange = (value: string) => {
    setAuthForm((prev) => ({ ...prev, password: value }));
    if (isRegistering) {
      validatePassword(value);
    }
  };

  // Verify invite code
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.AUTH.VERIFY_INVITE),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inviteCode: inviteCode.trim() }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setStep("auth");
      } else {
        setError(data.message || "邀请码无效");
      }
    } catch (error) {
      console.error("Invite verification error:", error);
      setError("验证失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // Login with NextAuth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.username || !authForm.password) {
      setError("请填写用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: authForm.username,
        password: authForm.password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户名或密码错误");
      } else if (result?.ok) {
        // Login successful, NextAuth will handle redirect
        window.location.href = "/lesson-plan";
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // Register user (still uses backend API, then signs in with NextAuth)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authForm.username || !authForm.password || !authForm.confirmPassword) {
      setError("请填写所有必填字段");
      return;
    }

    if (authForm.password !== authForm.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!validatePassword(authForm.password)) {
      setError("密码必须至少6个字符，并包含字母和数字");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First register with backend
      const response = await fetch(getApiUrl(API_ENDPOINTS.AUTH.REGISTER), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          username: authForm.username,
          password: authForm.password,
          confirmPassword: authForm.confirmPassword,
          preferences: userPreferences,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful, now sign in with NextAuth
        const result = await signIn("credentials", {
          username: authForm.username,
          password: authForm.password,
          redirect: false,
        });

        if (result?.ok) {
          window.location.href = "/lesson-plan";
        } else {
          setError("注册成功但登录失败，请手动登录");
        }
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg).join("; ");
          setError(errorMessages);
        } else {
          setError(data.message || "注册失败");
        }
      }
    } catch (error) {
      console.error("Register error:", error);
      setError("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // Direct login (skip invite code)
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.username || !authForm.password) {
      setError("请填写用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: authForm.username,
        password: authForm.password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户名或密码错误");
      } else if (result?.ok) {
        window.location.href = "/lesson-plan";
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // Render invite step
  const renderInviteStep = () => (
    <form onSubmit={handleInviteSubmit} className="space-y-6">
      <div className="text-left">
        <label htmlFor="inviteCode" className="block text-sm font-medium mb-2">
          邀请码
        </label>
        <input
          id="inviteCode"
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="请输入邀请码"
          className="input text-lg w-full"
          disabled={loading}
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || !inviteCode.trim()}
        className="btn btn-primary w-full text-lg py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            验证中...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ArrowRightIcon className="w-5 h-5" />
            验证邀请码
          </div>
        )}
      </button>
    </form>
  );

  // Render auth step (login/register choice)
  const renderAuthStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          邀请码验证成功！请选择登录方式
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setIsRegistering(false)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              !isRegistering
                ? "border-apple-blue bg-apple-blue/10 text-apple-blue"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="text-lg font-semibold">登录</div>
            <div className="text-sm text-gray-500">已有账号</div>
          </button>

          <button
            onClick={() => setIsRegistering(true)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              isRegistering
                ? "border-apple-green bg-apple-green/10 text-apple-green"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="text-lg font-semibold">注册</div>
            <div className="text-sm text-gray-500">创建新账号</div>
          </button>
        </div>
      </div>

      <form
        onSubmit={isRegistering ? handleRegister : handleLogin}
        className="space-y-4"
      >
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            用户名
          </label>
          <input
            id="username"
            type="text"
            value={authForm.username}
            onChange={(e) =>
              setAuthForm((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="请输入用户名"
            className="input w-full"
            disabled={loading}
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            密码
            {isRegistering && (
              <span className="text-xs text-gray-500 ml-2">
                (至少6位，包含字母和数字)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={authForm.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="请输入密码"
              className="input w-full pr-10"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Password strength indicators (registration only) */}
          {isRegistering && authForm.password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.length ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={passwordValidation.length ? 'text-green-600' : 'text-gray-500'}>
                  至少6个字符
                </span>
              </div>
              <div className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasLetter ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'}>
                  包含字母
                </span>
              </div>
              <div className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${passwordValidation.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                  包含数字
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm password (registration only) */}
        {isRegistering && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
            >
              确认密码
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={authForm.confirmPassword}
                onChange={(e) =>
                  setAuthForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="请再次输入密码"
                className={`input w-full pr-10 ${
                  authForm.confirmPassword && authForm.password !== authForm.confirmPassword
                    ? 'border-red-300 focus:border-red-500'
                    : authForm.confirmPassword && authForm.password === authForm.confirmPassword
                    ? 'border-green-300 focus:border-green-500'
                    : ''
                }`}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Password match indicator */}
            {authForm.confirmPassword && (
              <div className="mt-1 flex items-center text-xs">
                {authForm.password === authForm.confirmPassword ? (
                  <>
                    <div className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                    <span className="text-green-600">密码匹配</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full mr-2 bg-red-500" />
                    <span className="text-red-600">密码不匹配</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Teaching preferences (registration only) */}
        {isRegistering && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold">教学偏好设置</h4>

            <div>
              <label className="block text-sm font-medium mb-2">
                主要教学科目
              </label>
              <select
                value={userPreferences.subject}
                onChange={(e) =>
                  setUserPreferences((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="input w-full"
              >
                <option value="chinese">语文</option>
                <option value="math">数学</option>
                <option value="english">英语</option>
                <option value="physics">物理</option>
                <option value="chemistry">化学</option>
                <option value="biology">生物</option>
                <option value="history">历史</option>
                <option value="geography">地理</option>
                <option value="politics">政治</option>
                <option value="music">音乐</option>
                <option value="art">美术</option>
                <option value="pe">体育</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                主要教学阶段
              </label>
              <select
                value={userPreferences.gradeLevel}
                onChange={(e) =>
                  setUserPreferences((prev) => ({
                    ...prev,
                    gradeLevel: e.target.value,
                  }))
                }
                className="input w-full"
              >
                <option value="primary_1">小学一年级</option>
                <option value="primary_2">小学二年级</option>
                <option value="primary_3">小学三年级</option>
                <option value="primary_4">小学四年级</option>
                <option value="primary_5">小学五年级</option>
                <option value="primary_6">小学六年级</option>
                <option value="junior_1">初中一年级</option>
                <option value="junior_2">初中二年级</option>
                <option value="junior_3">初中三年级</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="easyMode"
                checked={userPreferences.easyMode}
                onChange={(e) =>
                  setUserPreferences((prev) => ({
                    ...prev,
                    easyMode: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-apple-blue"
              />
              <label htmlFor="easyMode" className="text-sm">
                启用简易模式（简化界面和功能）
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full text-lg py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {isRegistering ? "注册中..." : "登录中..."}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isRegistering ? (
                <UserPlusIcon className="w-5 h-5" />
              ) : (
                <CheckCircleIcon className="w-5 h-5" />
              )}
              {isRegistering ? "注册并登录" : "登录"}
            </div>
          )}
        </button>
      </form>

      <button
        onClick={() => setStep("invite")}
        className="text-sm text-apple-blue hover:text-apple-blue/80 w-full text-center"
      >
        ← 返回修改邀请码
      </button>
    </div>
  );

  // Render direct login
  const renderLoginStep = () => (
    <div className="space-y-6">
      <form onSubmit={handleDirectLogin} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            用户名
          </label>
          <input
            id="username"
            type="text"
            value={authForm.username}
            onChange={(e) =>
              setAuthForm((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="请输入用户名"
            className="input w-full"
            disabled={loading}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            密码
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={authForm.password}
              onChange={(e) =>
                setAuthForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="请输入密码"
              className="input w-full pr-10"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full text-lg py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              登录中...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              登录
            </div>
          )}
        </button>
      </form>

      <div className="text-center space-y-2">
        <button
          onClick={() => setStep("invite")}
          className="text-sm text-apple-blue hover:text-apple-blue/80"
        >
          ← 返回邀请码注册
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-apple-blue/5 via-apple-purple/5 to-apple-pink/5 dark:from-apple-blue/10 dark:via-apple-purple/10 dark:to-apple-pink/10">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-apple-blue/10 rounded-3xl">
              <KeyIcon className="w-12 h-12 text-apple-blue" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            欢迎使用 TeachAI
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {step === "invite" && "请输入您的邀请码以开始使用智能教案生成工具"}
            {step === "auth" && "请登录或注册您的账号"}
            {step === "login" && "请使用您的用户名和密码登录"}
          </p>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm mb-6">
              <ExclamationCircleIcon className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Form Content */}
          {step === "invite" && renderInviteStep()}
          {step === "auth" && renderAuthStep()}
          {step === "login" && renderLoginStep()}

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>邀请码由管理员提供</p>
            <p className="mt-1">如有问题请联系技术支持</p>

            {/* Direct login option */}
            {step === "invite" && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setStep("login")}
                  className="text-apple-blue hover:text-apple-blue/80 font-medium"
                >
                  已有账号？直接登录 →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}