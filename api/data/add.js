const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量中获取 secret key 和 JSON 数据文件存放目录
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 如果没有设置，使用默认的密钥
const dataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');  // 如果没有设置，使用默认的文件目录

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

  // 从查询参数中获取 fileName（例如 'poetry' 或 'notepapers'）
  const { fileName } = req.query;
  const newData = req.body;

  // 如果没有提供 fileName 或 newData，返回 400 错误
  if (!fileName) {
    return res.status(400).json({ message: 'FileName is required' });
  }
  if (!newData) {
    return res.status(400).json({ message: 'New data is required' });
  }

  // 拼接出 JSON 文件路径
  const jsonFilePath = path.join(dataDir, `${fileName}.json`);

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(jsonFilePath)) {
        return res.status(404).json({ message: `File ${fileName}.json not found` });
      }

      // 读取文件并解析 JSON 数据
      let data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

      // 增加新的数据
      data.push(newData);

      // 将修改后的数据写回 JSON 文件
      fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
      
      // 返回新增的数据
      res.status(201).json(newData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });
};
