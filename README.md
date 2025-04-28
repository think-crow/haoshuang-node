# 本仓库代码为[haoshuang](https://github.com/think-crow/haoshuang)仓库设计。 实现登录后对指定json、md文件进行增删改查。  
  
（为什么不用服务器：能不花钱就不花钱。感觉vercel应该比自己的服务器存活时间长！）  

设计思路：  
> 针对vercel免费提供的serverless function。可使用node.js编写后台代码托管在vercel上、vue3编写前端页面，请求接口来修改已授权的GitHub仓库内文件。

备注：直接修改网站的仓库，不太保险。暂时把代码部署在另一个仓库的main分支，修改其master分支内的容，待月底统一拉取更新。（构思Github action实现月底动推送，虽然很诱人，但git用的还不是太熟悉，暂时先不做）

- api文件夹下为请求接口。
- dist文件夹为vue3打包后的文件。
- vercel.json为路由配置文件。
- 本地可新建.env文件配置代码中的环境变量。


<!-- 
---下面的不用看了--- -->

<!-- 
npm install -g vercel  

在 Vercel 上运行 Node.js 的 API 路由的方式与在本地开发时稍有不同，特别是 Vercel 采用的是 serverless 架构，它要求每个 API 都是独立的函数，而不是传统意义上的 Express 路由。这意味着我们需要将每个路由处理器拆分成独立的文件，而不是将所有逻辑放在一个 index.js 文件里。  

Vercel 的 serverless 环境：每个 API 路由需要是一个单独的文件（或者说一个独立的 API 函数），不能像在传统的 Express 中那样把路由逻辑全部集中在一个地方。  

Express 与 Vercel：Vercel 默认不支持长时间运行的服务器实例，因此每个请求都会被处理为一个独立的函数，而不能通过 app.listen() 持续监听端口。  

如何修改：  
我们需要调整设计，以便每个 API 都是一个单独的函数，而不是传统的 Express 路由。例如，每个 API 端点（如登录、增删改查）都应该放在 api 目录下的独立文件中，Vercel 会自动将每个文件作为一个 serverless 函数进行部署。  

改进后的代码结构：  
创建文件结构：  
/project-root  
  /api  
    -login.js  
    -/data  
      --get.js  
      --/add.js  
      --/update.js  
      --/delete.js  
  -/data.json  
  -vercel.json  
  -package.json  

1、登录测试：
  在 Postman 中选择 Body 标签页，选择 raw，并设置格式为 JSON。
```
{
  "username": "your-username",
  "password": "your-password"
}
```

2、API文件 上传成功后，在生成的链接上面跟路径就能访问了，例如：/api/login    /api/data/add  
3、本地运行可创建.env文件保存环境变量，用于测试。
4、登录获取token之后，把token加在Authorization 选项卡的Bearer Token 即可模拟访问其它路由。

5、vercel本地运行测试命令：vercel dev

6、果然程序的问题，不能增加各种回调，可能会出问题（最不安全的最稳定）回滚到早上备份。
```
1\问题可能出在 authenticateJWT 是同步写法里用 await 调用一个 callback 函数，但它本身不是 Promise。这会导致 Vercel 的函数行为不稳定或无法完成响应。
2\如果你使用了异步函数（如 bcrypt.compare() 的回调），你必须确保 response 一定在所有异步逻辑结束后调用；

否则 Vercel 函数可能“先返回了”，导致请求无响应，或者调用不稳定。
```

7、有点灰心，弄了一天，发现不能修改文件，Gpt给的还是太模糊。
晚上强迫着替换为使用GitHub-api进行更新

2025-04-23 01:59  
哈哈哈，可以了！更改为axios请求GitHub-api，添加内容成功。

2025-04-28  
完工，json和md文件都正常了。

问题1：vue3本地跨域问题。vite设置后为什么代理没有生效。  
>Gpt生成的答案带这一条，vite文件中要把它删除掉：rewrite: (path) => path.replace(/^\/api/, ''), // 重写请求路径，去掉 /api 前缀。  
- 顺便清除一下缓存。  这个问题又找了好长时间。

问题2：调试Gpt给的代码时：先postman测试接口，后捋清逻辑让其给出前端代码，特别注意接口数据对接方式。
> 代码很多地方要不传参不对，要不名字没改，都要自行校正。

问题3：vue3打包后的dist在vervel上显示空白。
> vercel.json路由配置问题，找不到js文件了（虽然前端显示的请求成功）     
> { "src": "/assets/(.*)", "dest": "/dist/assets/$1" }, 注意assets前不要加dist

问题4：什么情况下前端请求到的数据是后端的index.html页面.
> 请求接口不正确时，因为错误逻辑的不完美，定位不是很准确，请求接口date不要错打成data

注意：query中传中文字符会自动变成url的那种类似乱码的东西。
 -->
