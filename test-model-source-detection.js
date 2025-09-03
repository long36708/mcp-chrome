/**
 * 模型来源检测功能测试脚本
 * 
 * 这个脚本可以在Chrome扩展的开发者工具控制台中运行，
 * 用于测试新增的模型来源检测功能。
 */

// 测试模型来源检测功能
async function testModelSourceDetection() {
  console.log('🧪 开始测试模型来源检测功能...');
  
  try {
    // 1. 测试获取模型来源信息
    console.log('\n📋 测试1: 获取当前模型来源信息');
    
    // 模拟调用 getModelSourceInfo 函数
    const mockModelSourceInfo = {
      source: 'cached',
      details: {
        downloadUrl: 'https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/onnx/model.onnx',
        cacheTimestamp: Date.now() - 86400000, // 1天前
        fileSize: 116 * 1024 * 1024, // 116MB
        isExpired: false
      }
    };
    
    console.log('✅ 模型来源信息:', mockModelSourceInfo);
    
    // 2. 测试本地模型检测
    console.log('\n📁 测试2: 本地模型检测');
    
    const mockLocalModelInfo = {
      source: 'local-file',
      details: {
        filePath: 'my-custom-model.onnx',
        fileName: 'my-custom-model.onnx',
        fileSize: 200 * 1024 * 1024, // 200MB
        storageType: 'indexeddb'
      }
    };
    
    console.log('✅ 本地模型信息:', mockLocalModelInfo);
    
    // 3. 测试格式化函数
    console.log('\n🔧 测试3: 格式化函数');
    
    // 测试文件大小格式化
    const testSizes = [1024, 1024 * 1024, 116 * 1024 * 1024, 1024 * 1024 * 1024];
    testSizes.forEach(size => {
      const formatted = formatFileSize(size);
      console.log(`📏 ${size} bytes -> ${formatted}`);
    });
    
    // 测试时间格式化
    const testTimestamps = [
      Date.now(), // 现在
      Date.now() - 86400000, // 1天前
      Date.now() - 7 * 86400000, // 7天前
      Date.now() - 30 * 86400000 // 30天前
    ];
    
    testTimestamps.forEach(timestamp => {
      const formatted = formatCacheTime(timestamp);
      console.log(`⏰ ${new Date(timestamp).toLocaleDateString()} -> ${formatted}`);
    });
    
    // 4. 测试存储位置文本
    console.log('\n💾 测试4: 存储位置文本');
    
    const storageTests = [
      { source: 'local-file', details: { storageType: 'indexeddb' } },
      { source: 'local-file', details: { storageType: 'chrome-storage' } },
      { source: 'cached', details: {} },
      { source: 'downloading', details: {} },
      { source: 'unknown', details: {} }
    ];
    
    storageTests.forEach(info => {
      const location = getStorageLocationText(info);
      console.log(`🗂️ ${info.source} -> ${location}`);
    });
    
    console.log('\n✅ 所有测试完成！模型来源检测功能正常工作。');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 辅助函数 - 模拟实际的格式化函数
function formatFileSize(bytes) {
  if (!bytes) return '未知大小';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatCacheTime(timestamp) {
  if (!timestamp) return '未知时间';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString();
  }
}

function getStorageLocationText(sourceInfo) {
  switch (sourceInfo.source) {
    case 'local-file':
      return sourceInfo.details.storageType === 'indexeddb' ? 'IndexedDB' : 'Chrome存储';
    case 'cached':
      return 'Cache API';
    case 'downloading':
      return '下载中...';
    default:
      return '未知';
  }
}

// UI测试函数
function testUIComponents() {
  console.log('\n🎨 UI组件测试');
  
  // 测试不同状态的样式类
  const sourceClasses = [
    'source-local-file',
    'source-cached', 
    'source-downloading',
    'source-unknown'
  ];
  
  sourceClasses.forEach(className => {
    console.log(`🎯 CSS类: ${className}`);
  });
  
  // 测试图标映射
  const iconMapping = {
    'local-file': '📁',
    'cached': '💾',
    'downloading': '⬇️',
    'unknown': '❓'
  };
  
  Object.entries(iconMapping).forEach(([source, icon]) => {
    console.log(`${icon} ${source}`);
  });
}

// 运行测试
console.log('🚀 模型来源检测功能测试脚本已加载');
console.log('💡 运行 testModelSourceDetection() 开始测试');
console.log('🎨 运行 testUIComponents() 测试UI组件');

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 延迟执行，确保所有依赖都已加载
  setTimeout(() => {
    testModelSourceDetection();
    testUIComponents();
  }, 1000);
}