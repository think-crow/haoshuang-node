const jwt = require('jsonwebtoken');

// 从环境变量获取用户信息
const username = process.env.USER_USERNAME;
const password = process.env.USER_PASSWORD;

const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key'; // 使用环境变量中的密钥，如果没有则使用默认值

module.exports = (req, res) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username: inputUsername, password: inputPassword } = req.body;

  // 检查用户名和密码是否匹配
  if (inputUsername !== username || inputPassword !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 生成 JWT Token
  const token = jwt.sign({ username: inputUsername }, secretKey, { expiresIn: '1h' });
  res.json({ token });
};
