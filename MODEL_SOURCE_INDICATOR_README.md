# 模型来源指示器功能实现

## 功能概述

本次更新为Chrome MCP Server扩展添加了详细的模型来源指示器，让用户能够清楚地了解当前语义引擎使用的模型来源，区分本地文件、缓存模型和远程下载的模型。

## 新增功能

### 1. 模型来源状态显示

在语义引擎状态卡片中新增了模型来源指示器，显示以下信息：

- **🟢 本地文件** - 用户上传的ONNX模型文件
- **🟡 本地缓存** - 从远程下载后缓存在本地的模型  
- **🔵 远程下载中** - 正在从HuggingFace等远程源下载
- **⚪ 未知来源** - 无法确定模型来源

### 2. 详细信息展示

根据不同的模型来源，显示相应的详细信息：

#### 本地文件模式
- 文件名
- 文件大小
- 存储方式（IndexedDB 或 Chrome存储）

#### 缓存模式
- 缓存时间
- 文件大小
- 过期状态提醒

#### 下载模式
- 下载源（HuggingFace）

## 技术实现

### 1. 后端功能扩展

在 `utils/semantic-similarity-engine.ts` 中新增：

```typescript
// 模型来源信息接口
export interface ModelSourceInfo {
  source: 'local-file' | 'cached' | 'downloading' | 'unknown';
  details: {
    filePath?: string;
    fileName?: string;
    cacheTimestamp?: number;
    downloadUrl?: string;
    fileSize?: number;
    storageType?: 'indexeddb' | 'chrome-storage';
    isExpired?: boolean;
  };
}

// 获取模型来源信息
export async function getModelSourceInfo(modelPreset?: ModelPreset): Promise<ModelSourceInfo>

// 辅助函数
export function getStorageLocationText(sourceInfo: ModelSourceInfo): string
export function formatFileSize(bytes?: number): string
export function formatCacheTime(timestamp?: number): string
```

### 2. 前端UI组件

在 `App.vue` 中新增模型来源指示器组件：

```vue
<div class="model-source-section">
  <div class="model-source-indicator">
    <div class="source-info">
      <span class="source-label">模型来源:</span>
      <span :class="['source-badge', getModelSourceClass()]">
        <span class="source-icon">{{ getModelSourceIcon() }}</span>
        <span class="source-text">{{ getModelSourceText() }}</span>
      </span>
    </div>
    <!-- 详细信息展示区域 -->
  </div>
</div>
```

### 3. 响应式状态管理

- 添加 `modelSourceInfo` 响应式数据
- 实现 `refreshModelSourceInfo()` 方法
- 在模型切换、本地模型应用等操作后自动刷新状态

### 4. 视觉设计

使用不同颜色和图标区分模型来源：

- **本地文件**: 绿色背景 + 📁 图标
- **本地缓存**: 黄色背景 + 💾 图标  
- **远程下载**: 蓝色背景 + ⬇️ 图标
- **未知来源**: 灰色背景 + ❓ 图标

## 用户体验改进

### 1. 实时状态更新

- 组件挂载时自动获取模型来源信息
- 模型切换后自动刷新状态
- 本地模型应用后立即更新显示

### 2. 详细信息提示

- 本地文件显示文件名、大小和存储方式
- 缓存模型显示缓存时间和过期状态
- 下载中显示下载源信息

### 3. 视觉反馈

- 使用颜色编码快速识别模型来源
- 过期缓存有特殊警告样式
- 响应式布局适配不同屏幕尺寸

## 使用场景

### 1. 开发调试
开发者可以清楚地知道当前使用的是哪种模型，便于调试和性能分析。

### 2. 用户透明度
用户可以了解模型的真实来源，确保使用的是期望的本地模型而非缓存版本。

### 3. 存储管理
用户可以了解模型的存储方式和大小，便于进行存储空间管理。

## 文件修改清单

1. `utils/semantic-similarity-engine.ts` - 新增模型来源检测功能
2. `entrypoints/popup/App.vue` - 添加UI组件和相关逻辑
3. 相关CSS样式 - 新增模型来源指示器样式

## 测试建议

1. 测试本地模型上传和显示
2. 测试预定义模型缓存状态显示
3. 测试模型切换时状态更新
4. 测试不同存储方式的显示
5. 测试缓存过期状态提醒

## 后续优化建议

1. 添加模型来源的工具提示说明
2. 支持更多模型格式的检测
3. 添加模型性能指标显示
4. 支持模型来源的筛选和排序