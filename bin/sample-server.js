#!/usr/bin/env node

const { program } = require("commander");
const Server = require("../lib/server");

// 配置命令行参数
program
  .option("-p, --port [port]", "设置服务器端口", "8080")
  .option("--proxy [url]", "设置代理地址")
  .option(
    "--headers [headers]",
    "设置请求头,默认设置代理请求的origin和host同页面",
    "{}"
  )
  .option("--noHot", "禁用启用热更新", false)
  .option("--ignore [patterns...]", "设置忽略的文件/文件夹，支持多个值", [])
  .option("--debug", "开启debug模式", false)
  .option("--https", "启用https", false)
  .parse(process.argv);

const options = program.opts();

// 解析请求头
try {
  options.headers = JSON.parse(options.headers);
} catch (e) {
  console.error("请求头格式错误，应为有效的JSON字符串");
  process.exit(1);
}

// 创建并启动服务器
const server = new Server({
  port: parseInt(options.port),
  proxy: options.proxy,
  headers: options.headers,
  noHot: options.noHot,
  ignore: options.ignore,
  https: options.https,
  debug: options.debug,
});

// 使用异步启动
server.start().catch((err) => {
  console.error("服务器启动失败:", err);
  process.exit(1);
});
