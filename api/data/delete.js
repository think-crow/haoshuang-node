const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量中获取密钥和数据文件路径
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 如果没有设置环境变量则使用默认值
const jsonDataPath = process.env.JSON_DATA_PATH || path.join(__dirname, '../../data.json');  // 获取环境变量中的 JSON 数据文件路径

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
  // 只允许 DELETE 请求
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    const { id } = req.params;  // 获取 URL 中的 id 参数

    try {
      // 读取文件并解析 JSON 数据
      const data = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));

      // 查找需要删除的项
      const index = data.findIndex(item => item.id === id);

      if (index === -1) {
        return res.status(404).json({ message: 'Data not found' });
      }

      // 删除对应的项
      data.splice(index, 1);

      // 将修改后的数据写回 JSON 文件
      fs.writeFileSync(jsonDataPath, JSON.stringify(data, null, 2));

      // 返回成功的响应
      res.status(204).end();  // 204 No Content 表示删除成功但没有返回内容
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to delete data' });
    }
  });
};
