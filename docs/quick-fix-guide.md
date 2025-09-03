# 快速修复指南

## 立即需要修复的问题

### 1. ModelVersion 类型冲突
在原始的 `semantic-similarity-engine.ts` 中添加：
```typescript
export type ModelVersion = 'full' | 'quantized' | 'compressed' | 'local';
```

### 2. 修复 App.vue 中的本地模型函数
替换 `selectLocalModelFile` 和 `applyLocalModel` 函数：

```typescript
const selectLocalModelFile = async () => {
  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'ONNX Files', accept: { 'application/octet-stream': ['.onnx'] } }]
    });
    
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    
    localModelData.value = arrayBuffer;
    localModelName.value = file.name;
    localModelSize.value = file.size;
    
    await chrome.storage.local.set({
      localModelData: Array.from(new Uint8Array(arrayBuffer)),
      localModelName: file.name,
      localModelSize: file.size,
    });
  } catch (error) {
    console.error('File selection failed:', error);
  }
};

const applyLocalModel = async () => {
  if (!localModelData.value) return;
  
  const modelDataArray = Array.from(new Uint8Array(localModelData.value));
  
  const response = await chrome.runtime.sendMessage({
    type: 'switch_semantic_model',
    useLocalModel: true,
    modelData: modelDataArray,
    modelName: localModelName.value,
    modelSize: localModelSize.value,
  });
  
  if (response?.success) {
    console.log('Local model applied successfully');
  }
};
```

### 3. 修复 background script 函数签名
在 `semantic-similarity.ts` 中更新 `handleModelSwitch` 函数：

```typescript
export async function handleModelSwitch(
  modelPreset: ModelPreset,
  modelVersion?: ModelVersion,
  modelDimension?: number,
  previousDimension?: number,
  useLocalModel?: boolean,
  localModelData?: number[] | string,
  localModelIdentifier?: string,
  localModelName?: string,
  localModelSize?: number,
): Promise<{ success: boolean; error?: string }> {
  // ... implementation
}
```

## 核心修复原理

**问题**: Chrome 扩展无法访问文件路径，只能获取文件名
**解决**: 读取文件内容（ArrayBuffer）并通过消息传递

这样修复后，本地模型加载就不会再报"找不到文件"的错误了。