const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');

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

// 删除文件
async function deleteMarkdownFile(filePath) {
  // 获取文件的 SHA 值，GitHub 删除文件需要这个信息
  const getFileResponse = await axios.get(`${BASE_URL}/contents/${filePath}?ref=master`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    }
  });
  // console.log('File info:', getFileResponse.data);  // 打印文件信息

  if (!getFileResponse.data || !getFileResponse.data.sha) {
    throw new Error(`File not found or no SHA returned for ${filePath}`);
  }
  const sha = getFileResponse.data.sha;  // 获取文件的 SHA

  const response = await axios.delete(`${BASE_URL}/contents/${filePath}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    },
    data: {
      message: `Delete Markdown file: ${filePath}`,
      sha: sha,  // 提交的 SHA
      branch: 'master',  // 可以根据需要指定分支，默认是 'main'
    }
  });

  return response.data;
}

module.exports = async (req, res) => {
  // 只允许 DELETE 请求
  if (req.method !== 'DELETE') {
    return res.status(405).json({ code: 405, message: 'Method Not Allowed', data: null });
  }

  authenticateJWT(req, res, async () => {
    const { fileName } = req.body;
    // console.log(fileName);

    if (!fileName) {
      return res.status(400).json({ code: 400, message: 'Missing fileName field', data: null });
    }

    // 直接使用传入的完整文件名
    const filePath = `content/posts/${fileName}`;
    // console.log(filePath);
    try {
      // 删除文件
      const result = await deleteMarkdownFile(filePath);

      return res.status(200).json({
        code: 200,
        message: 'Markdown file deleted successfully',
        data: result
      });
    } catch (error) {
      console.error('Error deleting Markdown file:', error.response?.data || error.message);
      return res.status(500).json({
        code: 500,
        message: 'Failed to delete Markdown file',
        data: error.response?.data || error.message
      });
    }
  });
};
