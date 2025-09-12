import Link from "next/link";
import {
  DocumentTextIcon,
  AcademicCapIcon,
  SparklesIcon,
  LightBulbIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "智能教案生成",
    description: "基于AI技术，快速生成结构化、个性化的教案内容",
    icon: DocumentTextIcon,
    href: "/lesson-plan",
    color: "text-apple-blue",
    bgColor: "bg-apple-blue/10",
  },
  {
    name: "练习题创建",
    description: "自动生成多样化的练习题，支持不同难度和题型",
    icon: AcademicCapIcon,
    href: "/exercises",
    color: "text-apple-green",
    bgColor: "bg-apple-green/10",
  },
  {
    name: "智能分析",
    description: "深度分析教学内容，提供优化建议和改进方案",
    icon: LightBulbIcon,
    href: "/analysis",
    color: "text-apple-orange",
    bgColor: "bg-apple-orange/10",
  },
];

const benefits = [
  {
    title: "节省时间",
    description: "将教案准备时间从数小时缩短至几分钟",
    icon: ClockIcon,
  },
  {
    title: "提高质量",
    description: "基于教育学理论，生成结构化、专业的教学内容",
    icon: CheckCircleIcon,
  },
  {
    title: "个性化定制",
    description: "根据学科、年级、教学目标灵活调整内容",
    icon: SparklesIcon,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-apple-blue/5 via-apple-purple/5 to-apple-pink/5 dark:from-apple-blue/10 dark:via-apple-purple/10 dark:to-apple-pink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-apple-blue/10 rounded-3xl">
                <SparklesIcon className="w-16 h-16 text-apple-blue" />
              </div>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">智能教案生成器</span>
            </h1>

            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              基于先进AI技术，为教师提供高效、智能的教案和练习题生成工具
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="btn btn-primary text-lg px-8 py-4 animate-scale"
              >
邀请码登录开始使用
              </Link>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  使用您的账户登录体验完整功能
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-light-surface/50 dark:bg-dark-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              强大功能，简单易用
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              集成多种AI功能，为教育工作者提供全方位的智能教学支持
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="card p-8 text-center group animate-up opacity-75 cursor-not-allowed"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`inline-flex p-4 rounded-2xl ${feature.bgColor} mb-6`}
                  >
                    <Icon className={`w-8 h-8 ${feature.color}`} />
                  </div>

                  <h3 className="text-xl font-semibold mb-4">{feature.name}</h3>

                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {feature.description}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    需要登录后使用
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              为什么选择 TeachAI？
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              让AI成为您的教学助手，提升教学效率和质量
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="text-center animate-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
                    <Icon className="w-8 h-8 text-apple-blue" />
                  </div>

                  <h3 className="text-xl font-semibold mb-4">
                    {benefit.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-300">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-apple-blue to-apple-purple dark:from-apple-blue/90 dark:to-apple-purple/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            准备好开始了吗？
          </h2>

          <p className="text-xl text-gray-800 dark:text-white/90 mb-8">
            立即体验AI驱动的智能教学工具，让教学变得更加高效
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="btn bg-white text-apple-blue hover:bg-gray-50 dark:bg-white dark:text-apple-blue dark:hover:bg-gray-100 text-lg px-8 py-4 font-semibold shadow-lg"
            >
              立即登录使用
            </Link>
            <div className="flex items-center justify-center mt-2">
              <p className="text-white/90 text-sm">
登录体验完整功能
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
