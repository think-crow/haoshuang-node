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

  const secretKey = process.env.JWT_SECRET_KEY;
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ code: 401, message: 'Invalid token', data: null });
    }
    req.user = user;
    next();
  });
};

// 创建文件并提交到 GitHub
async function createMarkdownFile(filePath, title, slug, date, draft, content) {
  const frontMatter = `+++
title = "${title}"
slug = "${slug}"
date = "${date}"
draft = ${draft}
+++ 
`;

  const fileContent = frontMatter + content;  // 拼接 front matter 和 Markdown 内容

  const encodedContent = Buffer.from(fileContent).toString('base64'); // Base64 编码内容

  const response = await axios.put(`${BASE_URL}/contents/${filePath}`, {
    message: `Add new Markdown file: ${title}`,
    content: encodedContent,
    branch: 'master',  // 可以根据需要指定分支，默认是 'main'
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
    // console.log(req.body);
    const { title, slug, date, draft, content } = req.body;

    if (!title || !slug || !date || !content || typeof draft === 'undefined') {
      return res.status(400).json({ code: 400, message: 'Missing required fields', data: null });
    }

    // 提取日期中的年、月、日，并格式化文件名
    const dateObject = new Date(date);  // 将传入的日期字符串转换为 Date 对象
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');  // 月份从 0 开始，需要加 1
    const day = String(dateObject.getDate()).padStart(2, '0');
    // console.log(date, year);

    // 生成文件名：年-月-日-title.md
    let formattedTitle = title;
       // 替换非法字符（包括中文中的特殊符号）为连字符
       formattedTitle = formattedTitle.replace(/[^\w\u4e00-\u9fa5\s]/g, '');
       formattedTitle = formattedTitle.replace(/[\/\\:*?"<>|]/g, '-');  // 替换非法字符为 -
       formattedTitle = formattedTitle.replace(/\s+/g, '-');  // 将空格替换为连字符


    // 如果需要将中文转为拼音，可以启用以下代码
    // formattedTitle = pinyin(title, { style: pinyin.STYLE_NORMAL }).join('-'); // 中文转拼音，并用 - 连接

    // 直接使用汉字作为文件名，确保合法性
    const fileName = `${year}-${month}-${day}-${formattedTitle}.md`;

    try {
      // 创建 Markdown 文件
      const result = await createMarkdownFile(`content/posts/${fileName}`, title, slug, date, draft, content);

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
