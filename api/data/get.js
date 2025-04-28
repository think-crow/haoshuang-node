const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();  // 用于读取环境变量

// GitHub API 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'think-crow';  // 替换为你的 GitHub 用户名
const REPO_NAME = 'haoshuang-node';  // 替换为你的仓库名
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

// 从环境变量获取密钥
const secretKey = process.env.JWT_SECRET_KEY;

// JWT 认证中间件
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

// 从 GitHub 仓库获取文件内容
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
    // GitHub 返回的是 base64 编码的内容
    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error fetching file from GitHub:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    const { filename } = req.query;  // 获取查询参数中的文件名

    if (!filename) {
      return res.status(400).json({ message: 'File name is required' });
    }

    try {
      // 从 GitHub 获取文件内容
      const fileContent = await getFileContent(`static/${filename}`, 'master');
      
      // 尝试解析 JSON 数据
      try {
        const jsonData = JSON.parse(fileContent);
        res.status(200).json({
          code: 200,
          message: 'Success',
          data: jsonData
        });
      } catch (err) {
        // 如果文件不是 JSON 格式，返回原始文本内容
        res.send(fileContent);
      }
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch file from GitHub' });
    }
  });
};



// 250421-20：15  我好兴奋啊！这个登录修改json数据的功能马上就要成了，我已经知道完整的思路了！
//按道理说能获取json数据，就能获取md数据，能获取md数据，就能对单篇文章形成更新！这个是操作文件的更新。控制核心内容展示可在前端进行拆分展示。

//25-04-23  
//兴奋早了 ，还好昨天晚上又找到一种方式。