const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow';  // 你的 GitHub 用户名
const REPO_NAME = 'haoshuang-node'; // 你的仓库名
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/content/posts?ref=master`;

// JWT 验证中间件
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];  // 获取 token
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Missing token', data: null });
  }

  const secretKey = process.env.JWT_SECRET_KEY;
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ code: 401, message: 'Invalid token', data: null });
    }
    req.user = user;
    next();  // 验证通过，继续执行后续逻辑
  });
};

async function getMarkdownFiles() {
  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
      },
    });

    // 过滤出所有 .md 文件
    const files = response.data.filter(file => file.name.endsWith('.md'));

    return files.map(file => ({
      name: file.name,
      path: file.path,
      url: file.download_url,
    }));
  } catch (error) {
    // console.error('Error fetching Markdown files:', error.response?.data || error.message || error);
    throw new Error('Failed to fetch Markdown files');
  }
}

// 用于 API 路由返回文件列表
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ code: 405, message: 'Method Not Allowed', data: null });
  }

  // JWT 验证
  authenticateJWT(req, res, async () => {
    try {
      const markdownFiles = await getMarkdownFiles();
      return res.status(200).json({
        code: 200,
        message: 'Fetched Markdown files successfully',
        data: markdownFiles,
      });
    } catch (error) {
      return res.status(500).json({
        code: 500,
        message: 'Failed to fetch Markdown files',
        data: error.message,
      });
    }
  });
};
