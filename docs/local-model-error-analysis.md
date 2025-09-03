# 本地模型加载错误分析

## 问题描述

当用户点击 `applyLocalModel` 按钮尝试应用本地 ONNX 模型时，会出现加载失败的错误。

## 错误流程分析

### 1. 文件选择阶段
```javascript
// 在 selectLocalModelFile 函数中
const fileHandle = await window.showOpenFilePicker({
  types: [
    {
      description: 'ONNX Model Files',
      accept: {
        'application/octet-stream': ['.onnx'],
      },
    },
  ],
  multiple: false,
});

const file = await fileHandle.getFile();
localModelPath.value = file.name; // ❌ 问题：只保存了文件名，如 "model.onnx"
```

**问题**：由于 Chrome 扩展的安全限制，无法获取用户选择文件的完整路径，只能获取文件名。

### 2. 消息发送阶段
```javascript
// 在 applyLocalModel 函数中
const response = await chrome.runtime.sendMessage({
  type: 'switch_semantic_model',
  useLocalModel: true,
  modelPath: localModelPath.value, // ❌ 传递的是 "model.onnx"，不是有效路径
  modelDimension: localModelDimension.value,
  modelIdentifier: localModelIdentifier.value,
});
```

**问题**：传递给 background script 的是无效的文件路径。

### 3. Background Script 处理阶段
```javascript
// 在 handleModelSwitch 函数中
const config = {
  useLocalFiles: true,
  modelPreset: 'local-model',
  localModelPath: localModelPath, // ❌ 设置为 "model.onnx"
  modelIdentifier: localModelIdentifier || 'local-model',
  modelDimension: modelDimension || 384,
};

// 发送到 Offscreen 脚本
const response = await chrome.runtime.sendMessage({
  target: 'offscreen',
  type: OFFSCREEN_MESSAGE_TYPES.SIMILARITY_ENGINE_INIT,
  config, // ❌ 包含无效的 localModelPath
});
```

**问题**：将无效的文件路径传递给 Offscreen 脚本。

### 4. Offscreen 脚本处理阶段
```javascript
// 在 semantic-similarity-engine.ts 中
if (useLocalFiles) {
  console.log('Loading model from local files, skipping network fetch...');
  // ❌ 尝试从 "model.onnx" 加载模型，但这不是有效路径
  return new ArrayBuffer(0);
}
```

**问题**：Offscreen 脚本无法从无效路径加载模型文件。

### 5. 错误返回阶段
```javascript
// 在 handleModelSwitch 函数中
if (response && response.success) {
  // 成功处理
} else {
  const errorMessage = response?.error || 'Failed to switch model';
  const errorType = analyzeErrorType(errorMessage);
  await updateModelStatus('error', 0, errorMessage, errorType);
  throw new Error(errorMessage); // ❌ 抛出错误
}
```

**结果**：错误被抛出并显示给用户。

## 根本原因

### Chrome 扩展安全限制
- Chrome 扩展出于安全考虑，无法获取用户选择文件的真实文件系统路径
- 只能通过 File API 获取文件名和文件内容
- 传递文件名给其他脚本无法实现文件访问

### 架构设计问题
- 当前架构假设可以通过文件路径访问本地模型
- 但在 Chrome 扩展环境中，这种假设不成立
- 需要通过文件内容而不是路径来处理本地模型

## 解决方案

### 方案 1：读取文件内容
```javascript
// 修改 selectLocalModelFile 函数
const selectLocalModelFile = async () => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'ONNX Model Files',
          accept: {
            'application/octet-stream': ['.onnx'],
          },
        },
      ],
      multiple: false,
    });

    const file = await fileHandle.getFile();
    
    // ✅ 读取文件内容而不是路径
    const arrayBuffer = await file.arrayBuffer();
    
    // 保存到扩展存储
    await chrome.storage.local.set({
      localModelData: Array.from(new Uint8Array(arrayBuffer)),
      localModelName: file.name,
    });
    
    localModelPath.value = file.name;
  } catch (error) {
    console.error('选择模型文件失败:', error);
  }
};
```

### 方案 2：修改消息传递
```javascript
// 修改 applyLocalModel 函数
const applyLocalModel = async () => {
  // ... 其他代码 ...

  // 获取文件数据
  const result = await chrome.storage.local.get(['localModelData']);
  
  const response = await chrome.runtime.sendMessage({
    type: 'switch_semantic_model',
    useLocalModel: true,
    modelData: result.localModelData, // ✅ 传递文件数据而不是路径
    modelDimension: localModelDimension.value,
    modelIdentifier: localModelIdentifier.value,
  });
  
  // ... 其他代码 ...
};
```

### 方案 3：修改 Offscreen 处理
```javascript
// 修改 semantic-similarity-engine.ts
async function getCachedModelData(
  modelUrl: string,
  useLocalFiles: boolean = false,
  localModelData?: number[], // ✅ 接收文件数据
): Promise<ArrayBuffer> {
  if (useLocalFiles && localModelData) {
    console.log('Loading model from local data...');
    // ✅ 从数据创建 ArrayBuffer
    return new Uint8Array(localModelData).buffer;
  }
  
  // ... 其他代码 ...
}
```

## 相关文件

- `app/chrome-extension/entrypoints/popup/App.vue` - 前端界面和文件选择逻辑
- `app/chrome-extension/entrypoints/background/semantic-similarity.ts` - 后台消息处理
- `app/chrome-extension/utils/semantic-similarity-engine.ts` - 模型加载逻辑
- `app/chrome-extension/entrypoints/offscreen/main.ts` - Offscreen 脚本处理

## 总结

本地模型加载失败的根本原因是 Chrome 扩展的安全限制导致无法获取有效的文件路径。解决方案是改为传递文件内容而不是文件路径，通过 File API 读取文件数据并在扩展内部传递。

## 优先级

**高优先级** - 这是影响本地模型功能正常使用的关键问题，需要尽快修复。

## 更新日期

2025年9月1日