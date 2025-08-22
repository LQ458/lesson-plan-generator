"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContentLayoutProps {
  children: React.ReactNode;
  selectedTab: string;
  onTabChange: (tab: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterSubject: string;
  onFilterSubjectChange: (subject: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
}

export default function ContentLayout({
  children,
  selectedTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  filterSubject,
  onFilterSubjectChange,
  sortBy,
  onSortByChange,
}: ContentLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          我的内容
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理您保存的教案和练习题
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="lesson-plans">教案</TabsTrigger>
          <TabsTrigger value="exercises">练习题</TabsTrigger>
          <TabsTrigger value="favorites">收藏</TabsTrigger>
        </TabsList>

        {/* 搜索和筛选器 - 只在教案和练习题页面显示 */}
        {(selectedTab === "lesson-plans" ||
          selectedTab === "exercises" ||
          selectedTab === "favorites") && (
          <div className="flex flex-col sm:flex-row gap-4 my-6">
            <Input
              placeholder={`搜索${selectedTab === "lesson-plans" ? "教案" : selectedTab === "exercises" ? "练习题" : "收藏"}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1"
            />
            {selectedTab !== "favorites" && (
              <>
                <div className="w-32">
                  <Select
                    value={filterSubject}
                    onValueChange={onFilterSubjectChange}
                  >
                    <SelectValue placeholder="科目" />
                    <SelectContent>
                      <SelectItem value="all">全部科目</SelectItem>
                      <SelectItem value="语文">语文</SelectItem>
                      <SelectItem value="数学">数学</SelectItem>
                      <SelectItem value="英语">英语</SelectItem>
                      <SelectItem value="物理">物理</SelectItem>
                      <SelectItem value="化学">化学</SelectItem>
                      <SelectItem value="生物">生物</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Select value={sortBy} onValueChange={onSortByChange}>
                    <SelectValue placeholder="排序" />
                    <SelectContent>
                      <SelectItem value="createdAt">创建时间</SelectItem>
                      <SelectItem value="updatedAt">更新时间</SelectItem>
                      <SelectItem value="title">标题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {children}
      </Tabs>
    </div>
  );
}
