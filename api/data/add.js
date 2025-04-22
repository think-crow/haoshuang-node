const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// 从环境变量中获取 GitHub token
const githubToken = process.env.GITHUB_TOKEN;  // GitHub Token 用于认证
const owner = process.env.GITHUB_OWNER || 'think-crow'; // GitHub 仓库的拥有者
const repo = process.env.GITHUB_REPO || 'haoshuang-node'; // GitHub 仓库名称
const branch = process.env.GITHUB_BRANCH || 'master';  // 默认分支更新为 'master'

// 初始化 GitHub 客户端
const octokit = new Octokit({
  auth: githubToken,
});

// JWT 认证中间件
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];  // 获取 Authorization header 中的 Token

  if (!token) {
    return res.status(403).json({ message: 'Access denied, no token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
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

  // 拼接出 JSON 文件路径, 假设文件在 static 文件夹内
  const filePath = `static/${fileName}.json`;  // 更新文件路径

  // JWT 验证
  await authenticateJWT(req, res, async () => {
    try {
      // 获取文件的当前内容
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch, // 使用 'master' 分支
      });

      // 获取文件的内容和 SHA 值
      const fileContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      let data = JSON.parse(fileContent);

      // 增加新的数据
      data.push(newData);

      // 提交更改到 GitHub
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Add new data to ${fileName}.json on master branch`,  // 提交信息更新
        content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
        sha: fileData.sha, // 使用原文件的 sha 值
        branch, // 提交到 master 分支
      });

      // 返回新增的数据
      res.status(201).json(newData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });
};
