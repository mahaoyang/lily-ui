// 将 @breakpoints { ... } 中的内容提取出来，去掉 @breakpoints 包装
const fs = require('fs');
const path = require('path');

const componentsDir = './src/styles/components';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 移除 @breakpoints { ... } 包装，保留内部内容
  let result = '';
  let depth = 0;
  let inBreakpoints = false;
  let i = 0;
  
  while (i < content.length) {
    // 检查是否是 @breakpoints
    if (content.slice(i, i + 12) === '@breakpoints') {
      // 找到 { 
      let j = i + 12;
      while (j < content.length && content[j] !== '{') j++;
      if (j < content.length) {
        // 跳过 @breakpoints {
        i = j + 1;
        inBreakpoints = true;
        depth = 1;
        continue;
      }
    }
    
    if (inBreakpoints) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          inBreakpoints = false;
          i++;
          continue;
        }
      }
    }
    
    result += content[i];
    i++;
  }
  
  return result;
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith('.css')) {
      console.log('Processing:', filePath);
      const fixed = processFile(filePath);
      fs.writeFileSync(filePath, fixed);
    }
  }
}

processDir(componentsDir);
console.log('Done!');
