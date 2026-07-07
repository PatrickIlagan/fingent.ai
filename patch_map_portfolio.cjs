const fs = require('fs');
let content = fs.readFileSync('src/pages/Investments.tsx', 'utf8');

content = content.replace("const mapPortfolioData = (dataList: any[]) => {\n      return dataList.map", "const mapPortfolioData = (dataList: any[]) => {\n      if (!Array.isArray(dataList)) return [];\n      return dataList.map");

fs.writeFileSync('src/pages/Investments.tsx', content);
