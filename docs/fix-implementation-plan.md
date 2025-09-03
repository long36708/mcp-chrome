# 本地模型加载问题修复实施计划

## 当前状态
由于多次编辑失败，我将创建一个完整的修复计划，然后一次性实施所有必要的更改。

## 需要修复的文件和具体更改

### 1. app/chrome-extension/entrypoints/popup/App.vue

#### 修改 selectLocalModelFile 函数
```javascript
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
    
    // 显示加载进度
    localModelProgress.value = '正在读取模型文件...';
    
    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      
      // 保存到扩展存储
      await chrome.storage.local.set({
        localModelData: Array.from(new Uint8Array(arrayBuffer)),
        localModelName: file.name,
        localModelSize: arrayBuffer.byteLength,
      });
      
      localModelPath.value = file.name;
      localModelProgress.value = `模型文件已加载: ${file.name} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`;
      
      // 清除进度信息
      setTimeout(() => {
        localModelProgress.value = '';
      }, 3000);
      
    } catch (readError) {
      console.error('读取模型文件失败:', readError);
      localModelProgress.value = `读取文件失败: ${readError.message}`;
      setTimeout(() => {
        localModelProgress.value = '';
      }, 5000);
    }
  } catch (error) {
    console.error('选择模型文件失败:', error);
    localModelProgress.value = `选择文件失败: ${error.message}`;
    setTimeout(() => {
      localModelProgress.value = '';
    }, 5000);
  }
};
```

#### 修改 applyLocalModel 函数中的消息发送部分
```javascript
// 获取本地模型数据
const modelDataResult = await chrome.storage.local.get(['localModelData', 'localModelName', 'localModelSize']);

if (!modelDataResult.localModelData) {
  throw new Error('本地模型数据未找到，请重新选择模型文件');
}

// Send message to background to switch to local model
const response = await chrome.runtime.sendMessage({
  type: 'switch_semantic_model',
  useLocalModel: true,
  modelData: modelDataResult.localModelData,
  modelName: modelDataResult.localModelName,
  modelSize: modelDataResult.localModelSize,
  modelDimension: localModelDimension.value,
  modelIdentifier: localModelIdentifier.value,
});
```

### 2. app/chrome-extension/utils/semantic-similarity-engine.ts

#### 在 PREDEFINED_MODELS 中添加 local-model
```javascript
'local-model': {
  modelIdentifier: 'local-model',
  dimension: 384, // Default dimension, can be overridden
  description: 'Local Model - User-provided ONNX model file',
  language: 'multilingual',
  performance: 'variable',
  size: 'variable',
  latency: 'variable',
  modelSpecificConfig: {
    requiresTokenTypeIds: false,
  },
},
```

#### 修改 getCachedModelData 函数
```javascript
async function getCachedModelData(
  modelUrl: string,
  useLocalFiles: boolean = false,
  localModelData?: number[],
): Promise<ArrayBuffer> {
  const cacheManager = ModelCacheManager.getInstance();

  // 如果使用本地文件且提供了数据，直接返回
  if (useLocalFiles && localModelData) {
    console.log('Loading model from local data...');
    return new Uint8Array(localModelData).buffer;
  }

  // 1. 尝试从缓存获取数据
  const cachedData = await cacheManager.getCachedModelData(modelUrl);
  if (cachedData) {
    return cachedData;
  }

  // 如果使用本地文件但没有数据，返回空 ArrayBuffer
  if (useLocalFiles) {
    console.log('Loading model from local files, skipping network fetch...');
    return new ArrayBuffer(0);
  }

  // ... 其余网络获取逻辑保持不变
}
```

### 3. app/chrome-extension/entrypoints/background/semantic-similarity.ts

#### 修改消息监听器
```javascript
if (message.useLocalModel) {
  handleModelSwitch(
    'local-model', // modelPreset
    'local', // modelVersion
    message.modelDimension,
    message.previousDimension,
    true, // useLocalModel
    message.modelData, // localModelData
    message.modelIdentifier, // localModelIdentifier
    message.modelName, // localModelName
    message.modelSize, // localModelSize
  )
}
```

#### 修改 handleModelSwitch 函数签名
```javascript
export async function handleModelSwitch(
  modelPreset: ModelPreset,
  modelVersion: 'full' | 'quantized' | 'compressed' = 'quantized',
  modelDimension?: number,
  previousDimension?: number,
  useLocalModel?: boolean,
  localModelData?: number[] | string,
  localModelIdentifier?: string,
  localModelName?: string,
  localModelSize?: number,
): Promise<{ success: boolean; error?: string }>
```

#### 修改函数内部逻辑
```javascript
// Check if we're switching to a local model
const isSwitchingToLocalModel = useLocalModel && localModelData;

// For local models, we need to check if the model has changed
if (isSwitchingToLocalModel) {
  const needsSwitch =
    !currentBackgroundModelConfig ||
    currentBackgroundModelConfig.modelPreset !== 'local-model' ||
    (currentBackgroundModelConfig as any).localModelName !== localModelName;
  // ...
}

// 配置部分
if (isSwitchingToLocalModel) {
  config.modelPreset = 'local-model';
  config.localModelData = localModelData;
  config.localModelName = localModelName;
  config.localModelSize = localModelSize;
  config.modelIdentifier = localModelIdentifier || 'local-model';
  config.modelDimension = modelDimension || 384;
}

// 保存配置部分
...(isSwitchingToLocalModel
  ? {
      localModelData: localModelData,
      localModelName: localModelName,
      localModelSize: localModelSize,
      modelIdentifier: localModelIdentifier || 'local-model',
    }
  : {}),
```

### 4. app/chrome-extension/entrypoints/offscreen/main.ts

#### 修改 handleSimilarityEngineInit 函数
```javascript
async function handleSimilarityEngineInit(config: any): Promise<void> {
  console.log('Offscreen: Initializing semantic similarity engine with config:', config);
  console.log('Offscreen: Config useLocalFiles:', config.useLocalFiles);
  
  try {
    if (config.useLocalFiles && config.localModelData) {
      // 处理本地模型数据
      similarityEngine = new SemanticSimilarityEngine({
        ...config,
        localModelData: config.localModelData,
      });
    } else {
      similarityEngine = new SemanticSimilarityEngine(config);
    }
    
    await similarityEngine.initialize();
    // ... 其余逻辑
  } catch (error) {
    console.error('Offscreen: Failed to initialize semantic similarity engine:', error);
    // ... 错误处理
  }
}
```

## 实施顺序
1. 首先修复 utils/semantic-similarity-engine.ts 中的类型定义
2. 然后修复 background/semantic-similarity.ts 中的函数签名和逻辑
3. 接着修复 popup/App.vue 中的文件处理逻辑
4. 最后修复 offscreen/main.ts 中的初始化逻辑

## 测试计划
1. 选择本地 ONNX 文件
2. 验证文件内容被正确读取和存储
3. 点击应用本地模型按钮
4. 验证消息正确传递到 background script
5. 验证 offscreen 脚本正确接收模型数据
6. 验证模型成功加载和初始化

## 预期结果
修复后，用户应该能够：
1. 成功选择本地 ONNX 模型文件
2. 文件内容被读取并存储在扩展存储中
3. 点击应用按钮后，模型数据被正确传递给处理脚本
4. 本地模型成功加载并可用于语义相似性计算