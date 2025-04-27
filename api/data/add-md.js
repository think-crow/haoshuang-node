const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Buffer } = require('buffer'); // Buffer to encode content in base64

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow';  // 你的 GitHub 用户名
const REPO_NAME = 'haoshuang-node'; // 你的仓库名
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Missing token', data: null });
  }

  const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ code: 401, message: 'Invalid token', data: null });
    }
    req.user = user;
    next();
  });
};

// 创建文件并提交到 GitHub
async function createMarkdownFile(filePath, title, date, author, tags, content) {
  const frontMatter = `---
title: "${title}"
date: "${date}"
author: "${author}"
tags: ${JSON.stringify(tags)}
---
`;

  const fileContent = frontMatter + content;  // 拼接 front matter 和 Markdown 内容

  const encodedContent = Buffer.from(fileContent).toString('base64'); // Base64 编码内容

  const response = await axios.put(`${BASE_URL}/contents/${filePath}`, {
    message: `Add new Markdown file: ${title}`,
    content: encodedContent,
    branch: 'master',  // 可以根据需要指定分支
  }, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    }
  });

  return response.data;
}

module.exports = async (req, res) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: 'Method Not Allowed', data: null });
  }

  authenticateJWT(req, res, async () => {
    const { title, date, author, tags, content } = req.body;

    if (!title || !date || !author || !content) {
      return res.status(400).json({ code: 400, message: 'Missing required fields', data: null });
    }

    const fileName = `${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;  // 生成文件名

    try {
      // 创建 Markdown 文件
      const result = await createMarkdownFile(`content/posts/${fileName}`, title, date, author, tags, content);

      return res.status(200).json({
        code: 200,
        message: 'Markdown file created successfully',
        data: result
      });
    } catch (error) {
      console.error('Error creating Markdown file:', error.response?.data || error.message);
      return res.status(500).json({
        code: 500,
        message: 'Failed to create Markdown file',
        data: error.response?.data || error.message
      });
    }
  });
};
