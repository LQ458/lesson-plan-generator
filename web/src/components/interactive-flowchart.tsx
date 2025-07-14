"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ClockIcon,
  AcademicCapIcon,
  PlayIcon,
  StopIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  PresentationChartBarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface TeachingStage {
  stage: string;
  content: string[];
  duration?: number;
}

interface InteractiveFlowchartProps {
  process: TeachingStage[];
  title: string;
  totalDuration?: number;
  className?: string;
}

interface StageNodeData {
  stage: string;
  content: string[];
  duration?: number;
}

interface StartNodeData {
  title: string;
}

// 自定义节点组件
const CustomStageNode = ({ data }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 类型断言，确保data有正确的结构
  const stageData = data as unknown as StageNodeData;

  const getStageIcon = (stage: string) => {
    const stageLower = stage.toLowerCase();
    if (stageLower.includes("导入") || stageLower.includes("开始")) {
      return <PlayIcon className="w-4 h-4" />;
    } else if (stageLower.includes("新课") || stageLower.includes("讲解")) {
      return <BookOpenIcon className="w-4 h-4" />;
    } else if (stageLower.includes("练习") || stageLower.includes("互动")) {
      return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
    } else if (stageLower.includes("总结") || stageLower.includes("结束")) {
      return <CheckCircleIcon className="w-4 h-4" />;
    } else {
      return <PresentationChartBarIcon className="w-4 h-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    const stageLower = stage.toLowerCase();
    if (stageLower.includes("导入") || stageLower.includes("开始")) {
      return "from-green-400 to-green-600";
    } else if (stageLower.includes("新课") || stageLower.includes("讲解")) {
      return "from-blue-400 to-blue-600";
    } else if (stageLower.includes("练习") || stageLower.includes("互动")) {
      return "from-purple-400 to-purple-600";
    } else if (stageLower.includes("总结") || stageLower.includes("结束")) {
      return "from-orange-400 to-orange-600";
    } else {
      return "from-gray-400 to-gray-600";
    }
  };

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br ${getStageColor(stageData.stage)} border border-white/20 min-w-[200px] max-w-[280px]`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center gap-2 mb-2">
        <div className="text-white/90">{getStageIcon(stageData.stage)}</div>
        <div className="text-white font-medium text-sm">{stageData.stage}</div>
        {stageData.duration && (
          <div className="ml-auto flex items-center gap-1 text-white/80 text-xs">
            <ClockIcon className="w-3 h-3" />
            {stageData.duration}分
          </div>
        )}
      </div>

      {stageData.content && stageData.content.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/90 text-xs hover:text-white transition-colors flex items-center gap-1"
          >
            {isExpanded ? "▼" : "▶"} 查看详情
          </button>

          {isExpanded && (
            <div className="mt-2 p-2 bg-white/10 rounded text-white/90 text-xs max-h-32 overflow-y-auto">
              <ul className="space-y-1">
                {stageData.content.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-white/70">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// 开始节点
const StartNode = ({ data }: NodeProps) => {
  const startData = data as unknown as StartNodeData;
  return (
    <div className="px-6 py-3 shadow-lg rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 border-2 border-white">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex items-center gap-2 text-white font-medium">
        <AcademicCapIcon className="w-5 h-5" />
        <span>{startData.title}</span>
      </div>
    </div>
  );
};

// 结束节点
const EndNode = ({ data: _data }: NodeProps) => (
  <div className="px-6 py-3 shadow-lg rounded-full bg-gradient-to-r from-red-500 to-red-600 border-2 border-white">
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="flex items-center gap-2 text-white font-medium">
      <StopIcon className="w-5 h-5" />
      <span>课程结束</span>
    </div>
  </div>
);

const nodeTypes = {
  customStage: CustomStageNode,
  start: StartNode,
  end: EndNode,
};

export default function InteractiveFlowchart({
  process,
  title,
  totalDuration,
  className = "",
}: InteractiveFlowchartProps) {
  // 生成节点和边
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 开始节点
    nodes.push({
      id: "start",
      type: "start",
      position: { x: 250, y: 50 },
      data: { title },
    });

    // 教学阶段节点
    let yPosition = 180;
    process.forEach((stage, index) => {
      const nodeId = `stage-${index}`;
      nodes.push({
        id: nodeId,
        type: "customStage",
        position: { x: 200, y: yPosition },
        data: {
          stage: stage.stage,
          content: stage.content,
          duration: stage.duration,
        },
      });

      // 连接到前一个节点
      if (index === 0) {
        edges.push({
          id: `start-${nodeId}`,
          source: "start",
          target: nodeId,
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 2 },
        });
      } else {
        edges.push({
          id: `stage-${index - 1}-${nodeId}`,
          source: `stage-${index - 1}`,
          target: nodeId,
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      }

      yPosition += 140;
    });

    // 结束节点
    nodes.push({
      id: "end",
      type: "end",
      position: { x: 250, y: yPosition },
      data: {},
    });

    // 连接最后一个阶段到结束节点
    if (process.length > 0) {
      edges.push({
        id: `stage-${process.length - 1}-end`,
        source: `stage-${process.length - 1}`,
        target: "end",
        animated: true,
        style: { stroke: "#ef4444", strokeWidth: 2 },
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [process, title]);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // 计算总时长
  const calculatedDuration =
    totalDuration ||
    process.reduce((total, stage) => total + (stage.duration || 0), 0);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* 头部信息 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PresentationChartBarIcon className="w-5 h-5 text-blue-500" />
            教学流程图
          </h3>
          {calculatedDuration > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              <ClockIcon className="w-4 h-4" />
              总计 {calculatedDuration} 分钟
            </div>
          )}
        </div>
      </div>

      {/* 流程图 */}
      <div style={{ width: "100%", height: "600px" }} className="relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-gray-50 dark:bg-gray-800"
        >
          <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" />
          <MiniMap
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
            nodeColor={(node) => {
              if (node.type === "start") return "#10b981";
              if (node.type === "end") return "#ef4444";
              return "#3b82f6";
            }}
          />
          <Background color="#e5e7eb" gap={16} />

          <Panel
            position="top-left"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3"
          >
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="font-medium mb-1">💡 操作提示</div>
              <div className="text-xs space-y-1">
                <div>• 点击节点"查看详情"展开内容</div>
                <div>• 拖拽节点调整位置</div>
                <div>• 使用控制面板缩放视图</div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
