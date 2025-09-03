# 本地模型加载问题修复说明

## 修复文件列表

以下文件已创建修复版本，请按顺序替换原文件：

### 1. 核心引擎文件
- **源文件**: `app/chrome-extension/utils/semantic-similarity-engine.ts`
- **修复文件**: `app/chrome-extension/utils/semantic-similarity-engine-fixed.ts`
- **修复内容**:
  - 添加 `ModelVersion` 类型定义，支持 'local' 版本
  - 修复 `PREDEFINED_MODELS` 中重复的 'local-model' 属性
  - 更新 `WorkerMessagePayload` 接口，添加 `useLocalFiles` 和 `localModelData` 属性
  - 完善本地模型支持逻辑

### 2. Background Script
- **源文件**: `app/chrome-extension/entrypoints/background/semantic-similarity.ts`
- **修复文件**: `app/chrome-extension/entrypoints/background/semantic-similarity-fixed.ts`
- **修复内容**:
  - 修复 `handleModelSwitch` 函数签名，支持本地模型参数
  - 更新消息处理逻辑，正确处理本地模型数据
  - 改进错误处理和状态管理

### 3. Popup UI
- **源文件**: `app/chrome-extension/entrypoints/popup/App.vue`
- **修复文件**: `app/chrome-extension/entrypoints/popup/App-fixed.vue`
- **修复内容**:
  - 修复 `selectLocalModelFile` 函数，读取文件内容而非路径
  - 修复 `applyLocalModel` 函数，传递文件数据而非文件名
  - 添加本地存储支持，持久化模型数据

## 替换步骤

1. **备份原文件**（推荐）:
   ```bash
   cp app/chrome-extension/utils/semantic-similarity-engine.ts app/chrome-extension/utils/semantic-similarity-engine.ts.backup
   cp app/chrome-extension/entrypoints/background/semantic-similarity.ts app/chrome-extension/entrypoints/background/semantic-similarity.ts.backup
   cp app/chrome-extension/entrypoints/popup/App.vue app/chrome-extension/entrypoints/popup/App.vue.backup
   ```

2. **替换文件**:
   ```bash
   mv app/chrome-extension/utils/semantic-similarity-engine-fixed.ts app/chrome-extension/utils/semantic-similarity-engine.ts
   mv app/chrome-extension/entrypoints/background/semantic-similarity-fixed.ts app/chrome-extension/entrypoints/background/semantic-similarity.ts
   mv app/chrome-extension/entrypoints/popup/App-fixed.vue app/chrome-extension/entrypoints/popup/App.vue
   ```

3. **重新构建项目**:
   ```bash
   pnpm install
   pnpm build
   ```

## 修复原理

### 问题根源
Chrome 扩展由于安全限制，无法直接访问用户选择文件的完整路径，只能获取文件名。原代码尝试将文件名作为路径传递给 Native Server，导致找不到文件。

### 解决方案
1. **文件内容读取**: 使用 `file.arrayBuffer()` 读取完整文件内容
2. **数据传递**: 将文件数据（ArrayBuffer）而非路径传递给 background script
3. **本地存储**: 使用 `chrome.storage.local` 持久化模型数据
4. **类型安全**: 完善 TypeScript 类型定义，避免编译错误

### 数据流程
```
用户选择文件 → 读取文件内容 → 存储到 chrome.storage → 
传递数据到 background → 发送到 offscreen → 模型加载
```

## 测试验证

修复后，本地模型加载流程应该：
1. ✅ 文件选择不报错
2. ✅ 文件内容正确读取和存储
3. ✅ 模型数据成功传递到 background script
4. ✅ 本地模型成功初始化（如果 Native Server 支持）
5. ✅ 错误提示准确反映实际问题（而非网络连接问题）

## 注意事项

1. **Native Server 支持**: 修复解决了文件传递问题，但 Native Server 仍需要支持本地 ONNX 模型加载
2. **内存使用**: 大型模型文件会占用较多内存，建议监控内存使用情况
3. **文件格式**: 确保选择的是有效的 ONNX 模型文件
4. **权限要求**: 需要 File System Access API 支持（现代浏览器）

## 回滚方案

如果修复后出现问题，可以恢复备份文件：
```bash
mv app/chrome-extension/utils/semantic-similarity-engine.ts.backup app/chrome-extension/utils/semantic-similarity-engine.ts
mv app/chrome-extension/entrypoints/background/semantic-similarity.ts.backup app/chrome-extension/entrypoints/background/semantic-similarity.ts
mv app/chrome-extension/entrypoints/popup/App.vue.backup app/chrome-extension/entrypoints/popup/App.vue