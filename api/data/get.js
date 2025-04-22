const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量获取密钥和默认数据目录路径
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 使用环境变量或默认值
const jsonDataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');  // 存放 JSON 文件的目录

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
    const { fileName } = req.query;  // 获取查询参数中的文件名

    if (!fileName) {
      return res.status(400).json({ message: 'File name is required' });
    }

    const filePath = path.join(jsonDataDir, fileName);  // 使用传入的文件名，可能带有后缀

    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: `File ${fileName} not found` });
      }

      // 读取文件并解析数据
      const data = fs.readFileSync(filePath, 'utf8');
      
      // 判断文件格式，简单返回 JSON 格式的数据
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (err) {
        // 如果文件不是 JSON 格式，直接返回文本内容
        res.send(data);
      }

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to read data' });
    }
  });
};



// 250421-20：15  我好兴奋啊！这个登录修改json数据的功能马上就要成了，我已经知道完整的思路了！
//按道理说能获取json数据，就能获取md数据，能获取md数据，就能对单篇文章形成更新！这个是操作文件的更新。控制核心内容展示可在前端进行拆分展示。
