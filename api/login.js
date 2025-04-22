// 密码加密方式argon2（2015年）和bcrypt（1999年）   bcrypt更简单，先用这个。
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 从环境变量获取用户信息
const username = process.env.USER_USERNAME;
const passwordHash = process.env.USER_PASSWORD_HASH; // 存储的是加密后的密码
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key'; // 使用环境变量中的密钥，如果没有则使用默认值

module.exports = (req, res) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username: inputUsername, password: inputPassword } = req.body;

  // 检查用户名是否匹配
  if (inputUsername !== username) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 使用 bcrypt 验证密码是否匹配
  bcrypt.compare(inputPassword, passwordHash, (err, isMatch) => {
    if (err) {
      return res.status(500).json({ message: '密码错误' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 生成 JWT Token
    const token = jwt.sign({ username: inputUsername }, secretKey, { expiresIn: '5h' });
    res.json({ token });
  });
};
