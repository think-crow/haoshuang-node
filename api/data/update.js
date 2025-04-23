const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();  // 用于读取环境变量

// 从环境变量获取 GitHub 配置和 JWT 密钥
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow';  // 替换为你的 GitHub 用户名
const REPO_NAME = 'haoshuang-node';  // 替换为你的仓库名
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

// JWT 验证中间件
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];  // 获取 Authorization header 中的 Token

  if (!token) {
    return res.status(403).json({ message: 'Access denied, no token provided' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token is not valid' });
    }
    req.user = user;  // 将用户信息附加到请求中
    next();
  });
};

// 获取文件内容
const getFileContent = async (filename, branch = 'master') => {
  try {
    const response = await axios.get(`${BASE_URL}/contents/static/${filename}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`
      },
      params: { ref: branch }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Error fetching file: ${err.message}`);
  }
};

// 获取文件内容
// const getFileContent = async (filename, branch = 'master') => {
//   try {
//     const response = await axios.get(`${BASE_URL}/contents/static/${filename}`, {
//       headers: {
//         'Authorization': `token ${GITHUB_TOKEN}`
//       },
//       params: { ref: branch }
//     });

//     // 解码 GitHub 返回的 base64 内容
//     const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
//     return decodedContent;
//   } catch (err) {
//     throw new Error(`Error fetching file: ${err.message}`);
//   }
// };


// 更新文件内容
const updateFileContent = async (filename, sha, message, content, branch = 'master') => {
  try {
    const response = await axios.put(`${BASE_URL}/contents/static/${filename}`, {
      message,
      content: Buffer.from(JSON.stringify(content)).toString('base64'),
      sha,  // 使用文件的最新 SHA 值
      branch  // 指定分支
    }, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`
      }
    });
    return response.data;
  } catch (err) {
    throw new Error(`Error updating file: ${err.message}`);
  }
};

// 数据更新
const updateData = (data, _id, updatedData) => {
  const index = data.findIndex(item => item._id === _id);
  if (index === -1) {
    throw new Error(`Data with _id ${_id} not found`);
  }

  // 更新数据
  data[index] = { ...data[index], ...updatedData };
  return data;
};

module.exports = async (req, res) => {
  // 只允许 PUT 或 PATCH 请求
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { filename, _id } = req.query;  // 从查询参数获取文件名和 _id
  const updatedData = req.body;
  console.log(filename);  // 输出文件路径，确认是否正确

  if (!filename || !_id) {
    return res.status(400).json({ message: 'File name and _id are required' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    try {
      // 获取 GitHub 上的文件内容
      const fileResponse = await getFileContent(filename);
      const fileContent = JSON.parse(Buffer.from(fileResponse.content, 'base64').toString('utf-8'));

      // 更新数据
      const updatedFileContent = updateData(fileContent, _id, updatedData);

      // 更新文件内容到 GitHub
      const updateResponse = await updateFileContent(filename, fileResponse.sha, 'Update JSON file with new data', updatedFileContent);

      res.json(updateResponse);  // 返回更新后的文件信息
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update data', details: err.message });
    }
  });
};
