const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量获取密钥和 JSON 数据文件路径
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 使用环境变量或默认值
const jsonDataPath = process.env.JSON_DATA_PATH || path.join(__dirname, '../../data.json');  // 使用环境变量或默认值

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

module.exports = async (req, res) => {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    try {
      // 读取文件并解析 JSON 数据
      const data = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));
      
      // 返回数据
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to read data' });
    }
  });
};
