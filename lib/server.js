const express = require("express");
const browserSync = require("browser-sync");
const { createProxyMiddleware } = require("http-proxy-middleware");
const net = require("net");
const os = require("os");
const path = require("path");
const networkInterfaces = os.networkInterfaces();
const https = require('https');
const selfsigned = require('selfsigned'); 
const fs = require('fs');

class Server {
  /**
   * 创建服务器实例
   * @param {Object} options 配置选项
   * @param {number} options.port 服务器端口
   * @param {string} options.proxy 代理地址
   * @param {Object} options.headers 请求头
   * @param {boolean} options.noHot 是否禁用热更新
   * @param {string|Array} options.ignore 忽略的文件/文件夹
   */
  constructor(options) {
    this.options = options;
    this.app = express();
  }

  // 格式化忽略规则
  formatIgnorePatterns() {
    const defaultIgnore = ["node_modules", ".git", ".idea", ".vscode"];
    if (!Array.isArray(this.options.ignore)) {
      return defaultIgnore;
    }
    return [...defaultIgnore, ...this.options.ignore];
  }

  // 设置静态资源中间件
  setupStatic() {
    // 使用 express.static 中间件处理静态文件
    this.app.use(
      express.static(process.cwd(), {
        // 设置不存在的文件直接通过 next()，而不是返回 404
        fallthrough: true,
      })
    );
  }

  // 初始化代理配置
  setupProxy() {
    if (this.options.proxy) {
      const proxyOptions = {
        target: this.options.proxy,
        changeOrigin: true,
        logLevel: this.options.debug ? "debug" : "silent", // 'silent' | 'error' | 'warn' | 'info' | 'debug'
        headers: this.options.headers || {},
        // 添加请求头处理函数
        onProxyReq: (proxyReq, req, res) => {
          // 设置 host 请求头，移除协议前缀
          proxyReq.setHeader(
            "host",
            this.options.proxy.replace(/^https?:\/\//, "")
          );
          // 设置 origin 请求头
          proxyReq.setHeader("origin", this.options.proxy);

          // 如果有自定义请求头，添加到请求中
          const customHeaders = this.options.headers || {};
          Object.keys(customHeaders).forEach((key) => {
            proxyReq.setHeader(key, customHeaders[key]);
          });
        },
      };
      // 只有当本地没有找到文件时才会走代理
      this.app.use(
        "/",
        createProxyMiddleware((pathname, req) => {
          return true; // 始终返回 true，因为 express.static 的 fallthrough 选项会确保找不到文件时才会到这里
        }, proxyOptions)
      );
    }
  }

  // 获取可用端口
  async getAvailablePort(startPort) {
    const maxAttempts = 20; // 设置最大尝试次数，避免无限循环
    let port = startPort;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // 使用 TCP 服务器测试端口
        const isAvailable = await new Promise((resolve, reject) => {
          const server = net.createServer();

          server.unref(); // 允许进程退出

          server.on("error", (err) => {
            server.close();
            if (err.code === "EADDRINUSE") {
              resolve(false);
            } else {
              reject(err);
            }
          });

          server.listen(port, () => {
            server.close();
            resolve(true);
          });
        });

        if (isAvailable) {
          return port;
        }

        console.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
        port++;
        attempts++;
      } catch (error) {
        console.error(`检查端口 ${port} 时发生错误:`, error);
        port++;
        attempts++;
      }
    }

    throw new Error(
      `无法找到可用端口，已尝试 ${attempts} 次，从 ${startPort} 到 ${port - 1}`
    );
  }

  // 生成自签名证书
  generateCertificate() {
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
      algorithm: 'sha256',
      days: 365,
      keySize: 2048,
    });
    
    return {
      key: pems.private,
      cert: pems.cert
    };
  }

  // 获取证书配置
  getCertificateConfig() {
    // 如果用户提供了证书配置，优先使用用户的配置
    if (this.options.https && typeof this.options.https === 'object') {
      const { key, cert } = this.options.https;
      if (key && cert) {
        try {
          return {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert)
          };
        } catch (error) {
          console.warn('读取自定义证书失败，将使用默认自签名证书', error);
        }
      }
    }
    // 使用自动生成的证书
    return this.generateCertificate();
  }

  // 更新打印方法以支持 HTTPS
  printSucccess(port, protocol = 'http') {
    console.log("Server is running on:");
    Object.keys(networkInterfaces).forEach((ifname) => {
      networkInterfaces[ifname].forEach((iface) => {
        if (iface.family === "IPv4" && !iface.internal) {
          console.log(`  ${protocol}://${iface.address}:${port}`);
        }
      });
    });
    console.log(`  ${protocol}://localhost:${port}`);
    console.log(`  ${protocol}://127.0.0.1:${port}`);
  }

  // 启动服务器
  async start() {
    this.setupStatic();
    this.setupProxy();

    const port = await this.getAvailablePort(this.options.port);
    let expressPort = port;
    if(!this.options.noHot){
      expressPort = await this.getAvailablePort(port+1);
    }
    
    // 创建服务器
    const createServer = () => {
      if (this.options.https && this.options.noHot) {
        const httpsOptions = this.getCertificateConfig();
        return https.createServer(httpsOptions, this.app);
      }
      return this.app;
    };


    const server = createServer().listen(expressPort, () => {
      const protocol = this.options.https ? 'https' : 'http';
      this.printSucccess(port, protocol);
      if (!this.options.noHot) {
        browserSync.init({
          proxy: `http://localhost:${expressPort}`,
          files: ["**/*.html", "**/*.css", "**/*.js"],
          open: false,
          notify: false,
          ui: false,
          port: port,
          logLevel: this.options.debug ? "debug" : "silent",
          https: this.options.https, // 设置 BrowserSync 使用 HTTPS
          ignore: this.formatIgnorePatterns(),
          snippetOptions: {
            rule: {
              match: /<\/body>/i,
              fn: function (snippet, match) {
                return snippet + match;
              }
            }
          }
        });
      } 
    });
  }
}

module.exports = Server;
