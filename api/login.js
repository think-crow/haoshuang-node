// 密码加密方式argon2（2015年）和bcrypt（1999年）   bcrypt更简单，先用这个。
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 从环境变量获取用户信息
const username = process.env.USER_USERNAME;
const passwordHash = process.env.USER_PASSWORD_HASH; // 存储的是加密后的密码
const secretKey = process.env.JWT_SECRET_KEY; // 使用环境变量中的密钥，如果没有则使用默认值

module.exports = (req, res) => {

    // ====== 新增：统一加 CORS 头 ======
    // res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源（开发阶段）
    res.setHeader('Access-Control-Allow-Origin', 'https://haoshuang-node.vercel.app');//允许指定源访问
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // ====== 处理 OPTIONS 预检请求 ======
  // if (req.method === 'OPTIONS') {
  //   return res.status(200).end();
  // }


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
      return res.status(500).json({ code: 1001, message: '用户名或密码错误' });
    }

    if (!isMatch) {
      return res.status(401).json({ code:401, message: '错误' });
    }

    // 生成 JWT Token
    const token = jwt.sign({ username: inputUsername }, secretKey, { expiresIn: '5h' });
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        username: inputUsername
      }
    });
  });
};
