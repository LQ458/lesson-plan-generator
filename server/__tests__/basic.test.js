// 基础测试示例
describe("基础功能测试", () => {
  test("数学运算测试", () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
    expect(8 / 2).toBe(4);
  });

  test("字符串操作测试", () => {
    const str = "Hello World";
    expect(str.length).toBe(11);
    expect(str.toUpperCase()).toBe("HELLO WORLD");
    expect(str.toLowerCase()).toBe("hello world");
    expect(str.includes("World")).toBe(true);
  });

  test("数组操作测试", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr[0]).toBe(1);
    expect(arr[arr.length - 1]).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr.find((x) => x > 3)).toBe(4);
  });

  test("对象操作测试", () => {
    const obj = {
      name: "张三",
      age: 25,
      city: "北京",
    };

    expect(obj.name).toBe("张三");
    expect(obj.age).toBe(25);
    expect(Object.keys(obj)).toHaveLength(3);
    expect(Object.keys(obj)).toContain("name");
  });

  test("异步操作测试", async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve("完成"), 100);
    });

    const result = await promise;
    expect(result).toBe("完成");
  });

  test("错误处理测试", () => {
    const throwError = () => {
      throw new Error("测试错误");
    };

    expect(throwError).toThrow("测试错误");
    expect(() => JSON.parse("invalid json")).toThrow();
  });
});

// 实用函数测试
describe("实用函数测试", () => {
  // 测试一个简单的计算器函数
  const calculator = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => {
      if (b === 0) throw new Error("除数不能为零");
      return a / b;
    },
  };

  test("计算器加法", () => {
    expect(calculator.add(2, 3)).toBe(5);
    expect(calculator.add(-1, 1)).toBe(0);
    expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3);
  });

  test("计算器减法", () => {
    expect(calculator.subtract(5, 3)).toBe(2);
    expect(calculator.subtract(0, 5)).toBe(-5);
  });

  test("计算器乘法", () => {
    expect(calculator.multiply(3, 4)).toBe(12);
    expect(calculator.multiply(-2, 3)).toBe(-6);
    expect(calculator.multiply(0, 100)).toBe(0);
  });

  test("计算器除法", () => {
    expect(calculator.divide(10, 2)).toBe(5);
    expect(calculator.divide(7, 2)).toBe(3.5);
    expect(() => calculator.divide(10, 0)).toThrow("除数不能为零");
  });
});

// 日期和时间测试
describe("日期时间测试", () => {
  test("当前日期测试", () => {
    const now = new Date();
    expect(now).toBeInstanceOf(Date);
    expect(now.getFullYear()).toBeGreaterThan(2020);
  });

  test("日期格式化测试", () => {
    const date = new Date("2025-01-01T00:00:00Z");
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(0); // 月份从0开始
    expect(date.getUTCDate()).toBe(1);
  });

  test("时间戳测试", () => {
    const timestamp = Date.now();
    expect(typeof timestamp).toBe("number");
    expect(timestamp).toBeGreaterThan(0);
  });
});

// 正则表达式测试
describe("正则表达式测试", () => {
  test("邮箱验证", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test("user@example.com")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("user@")).toBe(false);
  });

  test("手机号验证", () => {
    const phoneRegex = /^1[3-9]\d{9}$/;

    expect(phoneRegex.test("13812345678")).toBe(true);
    expect(phoneRegex.test("12812345678")).toBe(false);
    expect(phoneRegex.test("138123456789")).toBe(false);
  });

  test("中文字符验证", () => {
    const chineseRegex = /[\u4e00-\u9fa5]/;

    expect(chineseRegex.test("中文")).toBe(true);
    expect(chineseRegex.test("English")).toBe(false);
    expect(chineseRegex.test("中English文")).toBe(true);
  });
});

// 性能测试示例
describe("性能测试", () => {
  test("数组操作性能", () => {
    const startTime = Date.now();

    const largeArray = Array.from({ length: 10000 }, (_, i) => i);
    const result = largeArray
      .filter((x) => x % 2 === 0)
      .map((x) => x * 2)
      .reduce((sum, x) => sum + x, 0);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // 应该在1秒内完成
  });

  test("字符串操作性能", () => {
    const startTime = Date.now();

    let result = "";
    for (let i = 0; i < 1000; i++) {
      result += `字符串${i}`;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // 应该在1秒内完成
  });
});

// 模拟和Mock测试
describe("模拟测试", () => {
  test("函数模拟", () => {
    const mockFn = jest.fn();
    mockFn("参数1", "参数2");

    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith("参数1", "参数2");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("返回值模拟", () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue("模拟返回值");

    const result = mockFn();
    expect(result).toBe("模拟返回值");
  });

  test("异步模拟", async () => {
    const mockAsyncFn = jest.fn();
    mockAsyncFn.mockResolvedValue("异步返回值");

    const result = await mockAsyncFn();
    expect(result).toBe("异步返回值");
  });
});
