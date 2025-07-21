#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ErrorCode, McpError } = require('@modelcontextprotocol/sdk/types.js');
const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

class FrontendMCPServer {
  constructor() {
    this.server = new Server({
      name: 'frontend-dev-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.browser = null;
    this.page = null;
    this.frontendUrl = 'http://localhost:3000';
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // 工具：截取前端页面截图
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'screenshot':
            return await this.takeScreenshot(args?.url || this.frontendUrl);
          
          case 'get_page_content':
            return await this.getPageContent(args?.url || this.frontendUrl);
          
          case 'get_console_logs':
            return await this.getConsoleLogs();
          
          case 'check_frontend_status':
            return await this.checkFrontendStatus();
          
          case 'get_dom_element':
            return await this.getDomElement(args?.selector);
          
          case 'run_lighthouse':
            return await this.runLighthouse(args?.url || this.frontendUrl);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    if (!this.page) {
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
    }
  }

  async takeScreenshot(url = this.frontendUrl) {
    await this.initBrowser();
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const screenshot = await this.page.screenshot({
        type: 'png',
        fullPage: true,
        encoding: 'base64'
      });

      return {
        content: [{
          type: 'text',
          text: `Screenshot taken of ${url}`,
        }, {
          type: 'image',
          data: screenshot,
          mimeType: 'image/png'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to take screenshot: ${error.message}`
        }]
      };
    }
  }

  async getPageContent(url = this.frontendUrl) {
    await this.initBrowser();
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          html: document.documentElement.outerHTML,
          text: document.body.innerText,
          forms: Array.from(document.forms).map(form => ({
            action: form.action,
            method: form.method,
            elements: Array.from(form.elements).map(el => ({
              name: el.name,
              type: el.type,
              value: el.value
            }))
          }))
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(content, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get page content: ${error.message}`
        }]
      };
    }
  }

  async getConsoleLogs() {
    await this.initBrowser();
    
    const logs = [];
    
    this.page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    this.page.on('pageerror', error => {
      logs.push({
        type: 'error',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(logs, null, 2)
      }]
    };
  }

  async checkFrontendStatus() {
    try {
      const response = await fetch(this.frontendUrl);
      const isHealthy = response.ok;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: isHealthy ? 'healthy' : 'unhealthy',
            statusCode: response.status,
            url: this.frontendUrl,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: error.message,
            url: this.frontendUrl,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  async getDomElement(selector) {
    await this.initBrowser();
    
    try {
      const element = await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        
        return {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          innerHTML: el.innerHTML,
          outerHTML: el.outerHTML,
          textContent: el.textContent,
          attributes: Array.from(el.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          computedStyle: window.getComputedStyle(el).cssText,
          boundingRect: el.getBoundingClientRect()
        };
      }, selector);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(element, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to get DOM element: ${error.message}`
        }]
      };
    }
  }

  async runLighthouse(url = this.frontendUrl) {
    try {
      const lighthouse = require('lighthouse');
      const chromeLauncher = require('chrome-launcher');

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], port: chrome.port };
      const runnerResult = await lighthouse(url, options);

      await chrome.kill();

      const report = runnerResult.report;
      const scores = runnerResult.lhr.categories;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            scores: {
              performance: scores.performance?.score * 100,
              accessibility: scores.accessibility?.score * 100,
              bestPractices: scores['best-practices']?.score * 100,
              seo: scores.seo?.score * 100
            },
            url: url,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Lighthouse failed: ${error.message}`
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Frontend MCP Server running on stdio');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 处理进程退出
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  process.exit(0);
});

// 启动服务器
const server = new FrontendMCPServer();
server.run().catch(console.error); 