import * as React from "react";

interface TabsProps {
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, children }, ref) => {
    return (
      <div ref={ref} className={className}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // 只向特定的组件传递currentValue属性
            const childType = child.type;
            const isTabsComponent =
              childType === TabsList ||
              childType === TabsTrigger ||
              childType === TabsContent ||
              (typeof childType === "function" &&
                ((childType as any).displayName === "TabsList" ||
                  (childType as any).displayName === "TabsTrigger" ||
                  (childType as any).displayName === "TabsContent"));

            if (isTabsComponent) {
              return React.cloneElement(
                child as React.ReactElement<TabsChildProps>,
                {
                  currentValue: value,
                  onValueChange,
                },
              );
            }
          }
          return child;
        })}
      </div>
    );
  },
);
Tabs.displayName = "Tabs";

interface TabsChildProps {
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

interface TabsListProps extends TabsChildProps {
  className?: string;
  children: React.ReactNode;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, currentValue, onValueChange }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ""}`}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // 只向特定的组件传递currentValue属性
            const childType = child.type;
            const isTabsComponent =
              childType === TabsTrigger ||
              childType === TabsContent ||
              (typeof childType === "function" &&
                ((childType as any).displayName === "TabsTrigger" ||
                  (childType as any).displayName === "TabsContent"));

            if (isTabsComponent) {
              return React.cloneElement(
                child as React.ReactElement<TabsChildProps>,
                {
                  currentValue,
                  onValueChange,
                },
              );
            }
          }
          return child;
        })}
      </div>
    );
  },
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends TabsChildProps {
  className?: string;
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  (
    { className, value, currentValue, onValueChange, children, disabled },
    ref,
  ) => {
    const isActive = currentValue === value;

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          isActive
            ? "bg-background text-foreground shadow-sm"
            : "hover:bg-background/80"
        } ${className || ""}`}
        onClick={() => onValueChange?.(value)}
        disabled={disabled}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends TabsChildProps {
  className?: string;
  value: string;
  children: React.ReactNode;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, currentValue, children, ...rest }, ref) => {
    if (currentValue !== value) return null;

    // 过滤掉不应该传递给DOM的属性
    const { onValueChange, ...domProps } = rest;

    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ""}`}
        {...domProps}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
