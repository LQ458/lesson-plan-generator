import * as React from "react";

interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "variant"> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    const variants = {
      default:
        "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary:
        "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "text-foreground",
    };

    // 从 props 中移除 variant，防止其被传递到 DOM
    // 只允许标准属性透传
    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className || ""}`}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
