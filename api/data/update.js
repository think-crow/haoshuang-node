const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 从环境变量中获取密钥和 JSON 数据文件路径
const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';  // 使用环境变量或默认值
const jsonDataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');  // 存放 JSON 文件的目录

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

// 数据更新
const updateData = (fileName, _id, updatedData) => {
  const filePath = path.join(jsonDataDir, `${fileName}.json`);

  if (!fs.existsSync(filePath)) {
    return { status: 404, message: `File ${fileName}.json not found` };
  }

  // 读取文件并解析 JSON 数据
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const index = data.findIndex(item => item._id === _id);
  if (index === -1) {
    return { status: 404, message: `Data with _id ${_id} not found` };
  }

  // 针对不同的 JSON 文件，处理不同的字段
  if (fileName === 'notepapers') {
    // 针对 notepapers.json 格式的字段更新
    data[index] = { ...data[index], ...updatedData };
  } else if (fileName === 'poetrys') {
    // 针对 poetry.json 格式的字段更新
    data[index] = { ...data[index], ...updatedData };
  } else {
    return { status: 400, message: 'Unsupported file type' };
  }

  // 写回更新后的数据到文件
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  return { status: 200, data: data[index] };
};

module.exports = async (req, res) => {
  // 只允许 PUT 或 PATCH 请求
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fileName, _id } = req.query;  // 从查询参数获取文件名和 _id
  const updatedData = req.body;

  if (!fileName || !_id) {
    return res.status(400).json({ message: 'File name and _id are required' });
  }

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    try {
      // 更新数据
      const result = updateData(fileName, _id, updatedData);
      
      if (result.status !== 200) {
        return res.status(result.status).json({ message: result.message });
      }

      // 返回更新后的数据
      res.json(result.data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update data' });
    }
  });
};
