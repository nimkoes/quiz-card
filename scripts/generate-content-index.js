import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../public/content');

/**
 * 디렉토리에서 .md 파일을 재귀적으로 찾습니다
 */
function findMdFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // index.json이나 README.md는 제외
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        files.push(...findMdFiles(fullPath, baseDir));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // index.json이나 README.md는 제외
      if (entry.name !== 'README.md' && entry.name !== 'index.md') {
        files.push(relativePath);
      }
    }
  }

  return files;
}

/**
 * 카테고리별로 파일을 그룹화합니다
 */
function groupByCategory(files) {
  const categories = {};

  for (const file of files) {
    const parts = file.split(path.sep);
    if (parts.length >= 2) {
      const category = parts[0];
      const filename = parts[parts.length - 1];

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(filename);
    }
  }

  return categories;
}

try {
  console.log('Scanning content directory...');
  const mdFiles = findMdFiles(contentDir);
  const categories = groupByCategory(mdFiles);

  const indexData = {
    categories: Object.keys(categories).sort(),
    files: categories,
  };

  const indexPath = path.join(contentDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');

  console.log(`Found ${mdFiles.length} markdown files in ${Object.keys(categories).length} categories`);
  console.log(`Categories: ${indexData.categories.join(', ')}`);
  console.log(`Index file generated at: ${indexPath}`);
} catch (error) {
  console.error('Error generating content index:', error);
  process.exit(1);
}

