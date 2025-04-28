const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow'; 
const REPO_NAME = 'haoshuang-node'; 
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

async function getFileContent(filePath, branch = 'master') {
  const response = await axios.get(`${BASE_URL}/contents/${filePath}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
    },
    params: { ref: branch }
  });
  return response.data;
}

async function updateFileContent(filePath, message, content, sha, branch = 'master') {
  const response = await axios.put(`${BASE_URL}/contents/${filePath}`, {
    message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), // 格式化输出
    sha,
    branch,
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
    const { filename } = req.query;
    const newData = req.body;
    // console.log(req.body);

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ code: 500, message: 'Missing GitHub token', data: null });
    }

    if (!filename || !newData) {
      return res.status(400).json({ code: 400, message: 'Filename and data are required', data: null });
    }

    try {
      const fileResponse = await getFileContent(`static/${filename}`, 'master');
      const fileContent = JSON.parse(Buffer.from(fileResponse.content, 'base64').toString('utf-8'));

      fileContent.push(newData);

      const updateResponse = await updateFileContent(
        `static/${filename}`,
        'Update JSON file with new data',
        fileContent,
        fileResponse.sha,
        'master'
      );

      return res.status(200).json({
        code: 200,
        message: 'File updated successfully',
        data: updateResponse
      });
    } catch (error) {
      console.error('Error during file update process:', error.response?.data || error.message);
      return res.status(500).json({
        code: 500,
        message: 'Failed to update file',
        data: error.response?.data || error.message
      });
    }
  });
};
