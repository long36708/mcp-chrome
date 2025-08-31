# 模型缓存和下载地址

## 模型缓存位置

模型缓存存储在浏览器的 Cache Storage 中，具体位置是名为 'onnx-model-cache-v1' 的缓存空间。

在 Chrome 浏览器中，您可以通过以下步骤查看这些缓存：

1. 打开扩展管理页面 (chrome://extensions/)
2. 找到并启用 "开发者模式"
3. 点击 "检查视图" 中的 "service worker" 或 "background page"
4. 在开发者工具中，切换到 "Application" (应用) 标签
5. 在左侧边栏中展开 "Cache Storage"
6. 您应该能看到名为 'onnx-model-cache-v1' 的缓存，其中包含了下载的模型文件

这些缓存文件是持久化的，即使浏览器关闭后也会保留，直到达到缓存过期时间 (30天) 或缓存大小限制 (500MB) 时才会被清理。

需要注意的是，用户指定的本地模型文件不会被缓存，因为它们已经存在于用户的本地文件系统中，扩展直接从指定路径加载这些模型。

## multilingual-e5-base 模型下载地址

`multilingual-e5-base` 模型的下载地址是：

```
https://huggingface.co/Xenova/multilingual-e5-base/resolve/main/onnx/model_quantized.onnx
```

这个地址的构成如下：

1. 基础 URL：`https://huggingface.co/`
2. 模型标识符：`Xenova/multilingual-e5-base` (在代码中定义)
3. 文件路径：`/resolve/main/onnx/`
4. ONNX 文件名：`model_quantized.onnx` (代码中默认使用的量化版本)

当扩展需要下载这个模型时，它会使用这个 URL 从 Hugging Face 下载模型文件，并将其缓存到浏览器的 Cache Storage 中以供后续使用。

dimension: 768
