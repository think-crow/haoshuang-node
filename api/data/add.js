const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量中获取 secret key 和 JSON 数据文件路径
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 如果没有设置，使用默认的密钥
const jsonDataPath = process.env.JSON_DATA_PATH || path.join(__dirname, '../../data.json');  // 如果没有设置，使用默认的文件路径

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
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    const newData = req.body;

    try {
      // 读取文件并解析 JSON 数据
      const data = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));
      data.push(newData);  // 增加新的数据

      // 将修改后的数据写回 JSON 文件
      fs.writeFileSync(jsonDataPath, JSON.stringify(data, null, 2));
      
      // 返回新增的数据
      res.status(201).json(newData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to add data' });
    }
  });
};
