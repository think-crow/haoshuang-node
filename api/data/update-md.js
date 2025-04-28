const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Buffer } = require('buffer');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow'; 
const REPO_NAME = 'haoshuang-node'; 
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

const authenticateJWT = (req, res, next) => {
  // console.log(req);
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Missing token', data: null });
  }

  const secretKey = process.env.JWT_SECRET_KEY;
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ code: 401, message: 'Invalid token', data: null });
    }
    req.user = user;
    next();
  });
};

// 获取单篇 Markdown 文件内容
async function getMarkdownFile(filePath) {
  const response = await axios.get(`${BASE_URL}/contents/${filePath}?ref=master`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    }
  });

  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

  // 简单解析 front matter
  const match = content.match(/\+\+\+([\s\S]*?)\+\+\+([\s\S]*)/);
  if (!match) {
    throw new Error('Invalid Markdown format');
  }

  const frontMatterRaw = match[1];
  const bodyContent = match[2].trim();

  const meta = {};
  frontMatterRaw.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value !== undefined) {
      meta[key.trim()] = value.trim().replace(/^['"]|['"]$/g, '');
    }

  });

  return {
    sha: response.data.sha, // 更新时需要用到
    title: meta.title || '',
    slug: meta.slug || '',
    date: meta.date || '',
    draft: meta.draft === 'true',
    content: bodyContent
  };
}

// 更新 Markdown 文件
async function updateMarkdownFile(filePath, sha, title, slug, date, draft, content) {
  const frontMatter = `+++ 
title = "${title}"
slug = "${slug}"
date = "${date}"
draft = ${draft}
+++ 
`;

  const fileContent = frontMatter + content;
  const encodedContent = Buffer.from(fileContent).toString('base64');

  const response = await axios.put(`${BASE_URL}/contents/${filePath}`, {
    message: `Update Markdown file: ${title}`,
    content: encodedContent,
    sha: sha,
    branch: 'master',
  }, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    }
  });

  return response.data;
}

module.exports = async (req, res) => {
  authenticateJWT(req, res, async () => {
    // console.log(req.query);
    const { originalFileName } = req.query; // GET请求时带参数 ?originalFileName=xxx
    const { title, slug, draft, content } = req.body; // PUT请求时带body
    // console.log(req.body);

    if (req.method === 'GET') {
      if (!originalFileName) {
        return res.status(400).json({ code: 400, message: 'Missing originalFileName', data: null });
      }

      try {
        const filePath = `content/posts/${originalFileName}`;
        const fileData = await getMarkdownFile(filePath);

        return res.status(200).json({
          code: 200,
          message: 'Fetched Markdown file successfully',
          data: fileData
        });
      } catch (error) {
        console.error('Error fetching Markdown file:', error.response?.data || error.message);
        return res.status(500).json({
          code: 500,
          message: 'Failed to fetch Markdown file',
          data: error.response?.data || error.message
        });
      }

    } else if (req.method === 'PUT') {
      const { originalFileName } = req.body;

      if (!title || !slug || typeof draft === 'undefined' || !content || !originalFileName) {
        return res.status(400).json({ code: 400, message: 'Missing required fields', data: null });
      }

      try {
        const filePath = `content/posts/${originalFileName}`;
        const existingFile = await getMarkdownFile(filePath);

        // 注意：用原来的 date，不用新的
        const result = await updateMarkdownFile(
          filePath,
          existingFile.sha,
          title,
          slug,
          existingFile.date, 
          draft,
          content
        );

        return res.status(200).json({
          code: 200,
          message: 'Markdown file updated successfully',
          data: result
        });
      } catch (error) {
        console.error('Error updating Markdown file:', error.response?.data || error.message);
        return res.status(500).json({
          code: 500,
          message: 'Failed to update Markdown file',
          data: error.response?.data || error.message
        });
      }

    } else {
      return res.status(405).json({ code: 405, message: 'Method Not Allowed', data: null });
    }
  });
};
