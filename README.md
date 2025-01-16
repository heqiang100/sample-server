# sample-server

一个基于 Express 和 Browser-sync 的适合前端开发的开发服务器，一键使用，支持代理配置和热更新功能。

## 特性
- 🚀 支持设置代理地址
- 🔧 支持自定义请求头
- 🎯 支持端口配置（自动检测端口占用）
- 🔄 默认开启热更新
- ⚡️ 基于 Express 的轻量级服务器
- 🔍 智能端口检测，自动寻找可用端口
- 🔒 支持https

## 安装

```bash
npm install sample-server -g
```

## 使用方法

### 基本使用

```bash
sample-server
```
默认启动在 8080 端口，如果端口被占用会自动尝试 8081、8082 等端口，直到找到可用端口。默认开启热更新功能。

### 设置端口

```bash
sample-server -p 3001
```
如果指定的端口 3001 被占用，会自动尝试 3002、3003 等端口。

### 设置代理

```bash
sample-server --proxy http://api.example.com
```
### 设置请求头

```bash
sample-server --headers '{"Authorization": "Bearer 1234567890"}'
```
### 关闭热更新

```bash
sample-server --noHot
```
### 设置忽略文件

```bash
# 忽略单个目录或文件
sample-server --ignore dist

# 忽略多个目录或文件
sample-server --ignore dist test coverage

# 支持 glob 模式
sample-server --ignore "*.log" "temp/**/*"
```
### 组合使用

```bash
sample-server -p 3001 --proxy http://api.example.com --headers '{"Authorization": "Bearer 1234567890"}' --ignore dist test coverage
```

### 启用https

```bash
sample-server --https
```

## 配置选项

| 选项 | 描述 | 默认值 | 说明 |
|------|------|--------|------|
| -p, --port | 服务器端口 | 8080 | 如被占用自动+1 |
| --proxy | 代理地址 | - | - |
| --headers | 请求头（JSON格式）默认设置代理请求的origin和host同页面 | {} | - |
| --noHot | 禁用热更新 | false | - |
| --ignore | 忽略的文件/文件夹 | [] | 支持多个值和glob模式 |
| --https | 启用https | false | - |
| --debug | 启用debug | false | - |
| -h, --help | 显示帮助信息 | - | - |

## 端口占用处理

当指定的端口被占用时，服务器会：
1. 自动检测端口是否可用
2. 如果端口被占用，会尝试端口号+1
3. 持续尝试直到找到可用端口
4. 启动后显示最终使用的端口号

## 监听文件

默认监听以下文件变化：
- HTML 文件 (`**/*.html`)
- CSS 文件 (`**/*.css`)
- JavaScript 文件 (`**/*.js`)

## 开发
```bash
git clone https://github.com/heqiang100/sample-server.git
cd sample-server
npm install
npm start
```

## 许可证

MIT

## 忽略文件说明

默认忽略的文件/文件夹：
- node_modules
- .git
- .idea
- .vscode

自定义忽略规则：
- 支持多个文件/文件夹作为独立参数
- 支持 glob 模式
- 示例：
  ```bash
  sample-server --ignore dist test "*.log" "temp/**/*"
  ```