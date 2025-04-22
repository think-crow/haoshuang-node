const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();  // 用于读取环境变量

// GitHub API 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow';  // 替换为你的 GitHub 用户名
const REPO_NAME = 'haoshuang-node';  // 替换为你的仓库名
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

// 用于验证 JWT 的中间件
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // 从请求头部获取 token
  if (!token) {
    return res.status(403).json({ message: 'No token provided' }); // 如果没有 token，返回 403
  }

  const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key'; // 获取 secretKey
  jwt.verify(token, secretKey, (err, user) => { // 验证 token
    if (err) {
      return res.status(403).json({ message: 'Invalid token' }); // token 无效
    }
    req.user = user; // 将验证通过的用户信息保存到请求对象中
    next(); // 验证通过后继续处理请求
  });
};

// 获取文件内容
async function getFileContent(filePath, branch = 'master') {
  try {
    const response = await axios.get(`${BASE_URL}/contents/${filePath}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
      },
      params: {
        ref: branch,  // 指定分支
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching file:', error);
    throw error;
  }
}

// 更新文件内容
async function updateFileContent(filePath, message, content, sha, branch = 'master') {
  try {
    const response = await axios.put(`${BASE_URL}/contents/${filePath}`, {
      message,
      content: Buffer.from(JSON.stringify(content)).toString('base64'),
      sha,  // 使用最新的 SHA 值
      branch,  // 确保更新到指定的分支
    }, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating file:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = async (req, res) => {
  authenticateJWT(req, res, async () => {
    const { filename } = req.query;
    const newData = req.body;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub token not found in environment variables.' });
    }

    if (!filename || !newData) {
      return res.status(400).json({ error: 'Filename and new data must be provided.' });
    }

    try {
      // 获取 master 分支的最新文件内容和 SHA 值
      const fileResponse = await getFileContent(`static/${filename}`, 'master');
      const fileContent = JSON.parse(Buffer.from(fileResponse.content, 'base64').toString('utf-8'));

      // 插入新数据
      fileContent.push(newData);

      // 更新文件内容到 master 分支
      const updateResponse = await updateFileContent(`static/${filename}`, 'Update JSON file with new data', fileContent, fileResponse.sha, 'master');

      return res.status(200).json(updateResponse);
    } catch (error) {
      console.error('Error during file update process:', error);
      return res.status(500).json({ error: 'An error occurred while updating the file.', details: error.message });
    }
  });
};
