// ==UserScript==
// @name         AugmentCode自动注册
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动完成AugmentCode的注册流程
// @author       Your name
// @match        https://*.augmentcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @connect      tempmail.plus
// ==/UserScript==

(function() {
    'use strict';

    // 创建日志UI
    function createLogUI() {
        const logContainer = document.createElement('div');
        logContainer.innerHTML = `
            <div id="auto-register-log" style="
                position: fixed;
                bottom: 40px;
                right: 20px;
                width: 300px;
                max-height: 400px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    padding: 12px;
                    background: #1a73e8;
                    color: white;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>自动注册日志</span>
                    <div>
                        <button id="auto-register-btn" style="
                            background: #34a853;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 12px;
                            padding: 4px 8px;
                            border-radius: 4px;
                            margin-right: 8px;
                            display: none;
                        ">开始注册</button>
                        <button id="clear-log" style="
                            background: transparent;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 12px;
                            padding: 4px 8px;
                            border-radius: 4px;
                        ">清除</button>
                        <button id="minimize-log" style="
                            background: transparent;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 14px;
                            padding: 4px 8px;
                            margin-left: 8px;
                        ">_</button>
                    </div>
                </div>
                <div id="log-content" style="
                    padding: 12px;
                    overflow-y: auto;
                    max-height: 300px;
                    font-size: 13px;
                "></div>
            </div>
        `;

        document.body.appendChild(logContainer);

        // 最小化功能
        let isMinimized = false;
        const logContent = document.getElementById('log-content');
        const minimizeBtn = document.getElementById('minimize-log');

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            logContent.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '□' : '_';
        });

        // 清除日志功能
        const clearBtn = document.getElementById('clear-log');
        clearBtn.addEventListener('click', () => {
            logContent.innerHTML = '';
        });

        return {
            log: function(message, type = 'info') {
                const logEntry = document.createElement('div');
                logEntry.style.marginBottom = '8px';
                logEntry.style.padding = '8px';
                logEntry.style.borderRadius = '4px';
                logEntry.style.wordBreak = 'break-word';

                switch(type) {
                    case 'success':
                        logEntry.style.background = '#e6f4ea';
                        logEntry.style.color = '#1e8e3e';
                        break;
                    case 'error':
                        logEntry.style.background = '#fce8e6';
                        logEntry.style.color = '#d93025';
                        break;
                    case 'warning':
                        logEntry.style.background = '#fef7e0';
                        logEntry.style.color = '#ea8600';
                        break;
                    default:
                        logEntry.style.background = '#f8f9fa';
                        logEntry.style.color = '#202124';
                }

                const time = new Date().toLocaleTimeString();
                logEntry.textContent = `[${time}] ${message}`;
                logContent.appendChild(logEntry);
                logContent.scrollTop = logContent.scrollHeight;
            },
            showRegisterButton: function() {
                const registerBtn = document.getElementById('auto-register-btn');
                if (registerBtn) {
                    logger.log('找到注册按钮，正在显示...');
                    registerBtn.style.display = 'inline-block';
                    return registerBtn;
                } else {
                    logger.log('未找到注册按钮元素', 'error');
                    return null;
                }
            }
        };
    }

    // 创建全局日志对象
    const logger = createLogUI();

    // 配置
    const EMAIL_DOMAIN = "@hex.cloudns.be";
    const TEMP_MAIL_CONFIG = {
        username: "xxxx",
        emailExtension: "@mailto.plus",
        epin: ""
    };
    
    const FIRST_NAMES = ["linda", "john", "mary", "david", "sarah", "michael", "jennifer"];
    const LAST_NAMES = ["garcia", "smith", "johnson", "brown", "davis", "miller", "wilson"];

    // 生成随机邮箱
    function generateEmail() {
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const timestamp = Date.now().toString(36); // 转换为36进制以缩短长度
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 生成4位随机数
        let username = `${firstName}${lastName}${timestamp}${randomNum}`;
        return `${username}${EMAIL_DOMAIN}`;
    }

    // 等待元素出现
    async function waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    // 从邮件文本中提取验证码
    function extractVerificationCode(mailText) {
        const codeMatch = mailText.match(/(?<![a-zA-Z@.])\b\d{6}\b/);
        return codeMatch ? codeMatch[0] : null;
    }

    // 删除邮件
    async function deleteEmail(firstId) {
        return new Promise((resolve, reject) => {
            const deleteUrl = 'https://tempmail.plus/api/mails/';
            const maxRetries = 5;
            let retryCount = 0;

            function tryDelete() {
                GM_xmlhttpRequest({
                    method: "DELETE",
                    url: deleteUrl,
                    data: `email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&first_id=${firstId}&epin=${TEMP_MAIL_CONFIG.epin}`,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    onload: function(response) {
                        try {
                            const result = JSON.parse(response.responseText).result;
                            if (result === true) {
                                logger.log("邮件删除成功", 'success');
                                resolve(true);
                                return;
                            }
                        } catch (error) {
                            logger.log("解析删除响应失败: " + error, 'warning');
                        }

                        // 如果还有重试次数，继续尝试
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件失败，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败，已达到最大重试次数", 'error');
                            resolve(false);
                        }
                    },
                    onerror: function(error) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            logger.log(`删除邮件出错，正在重试 (${retryCount}/${maxRetries})...`, 'warning');
                            setTimeout(tryDelete, 500);
                        } else {
                            logger.log("删除邮件失败: " + error, 'error');
                            resolve(false);
                        }
                    }
                });
            }

            tryDelete();
        });
    }

    // 获取最新邮件中的验证码
    async function getLatestMailCode() {
        return new Promise((resolve, reject) => {
            const mailListUrl = `https://tempmail.plus/api/mails?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&limit=20&epin=${TEMP_MAIL_CONFIG.epin}`;
            
            GM_xmlhttpRequest({
                method: "GET",
                url: mailListUrl,
                onload: async function(mailListResponse) {
                    try {
                        const mailListData = JSON.parse(mailListResponse.responseText);
                        if (!mailListData.result || !mailListData.first_id) {
                            resolve(null);
                            return;
                        }

                        const firstId = mailListData.first_id;
                        const mailDetailUrl = `https://tempmail.plus/api/mails/${firstId}?email=${TEMP_MAIL_CONFIG.username}${TEMP_MAIL_CONFIG.emailExtension}&epin=${TEMP_MAIL_CONFIG.epin}`;

                        GM_xmlhttpRequest({
                            method: "GET",
                            url: mailDetailUrl,
                            onload: async function(mailDetailResponse) {
                                try {
                                    const mailDetailData = JSON.parse(mailDetailResponse.responseText);
                                    if (!mailDetailData.result) {
                                        resolve(null);
                                        return;
                                    }

                                    const mailText = mailDetailData.text || "";
                                    const mailSubject = mailDetailData.subject || "";
                                    logger.log("找到邮件主题: " + mailSubject);

                                    const code = extractVerificationCode(mailText);
                                    
                                    // 获取到验证码后，尝试删除邮件
                                    if (code) {
                                        await deleteEmail(firstId);
                                    }
                                    
                                    resolve(code);
                                } catch (error) {
                                    logger.log("解析邮件详情失败: " + error, 'error');
                                    resolve(null);
                                }
                            },
                            onerror: function(error) {
                                logger.log("获取邮件详情失败: " + error, 'error');
                                resolve(null);
                            }
                        });
                    } catch (error) {
                        logger.log("解析邮件列表失败: " + error, 'error');
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    logger.log("获取邮件列表失败: " + error, 'error');
                    resolve(null);
                }
            });
        });
    }

    // 获取验证码（带重试机制）
    async function getVerificationCode(maxRetries = 5, retryInterval = 3000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            logger.log(`尝试获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`);

            try {
                const code = await getLatestMailCode();
                if (code) {
                    logger.log("成功获取验证码: " + code, 'success');
                    return code;
                }

                if (attempt < maxRetries - 1) {
                    logger.log(`未获取到验证码，${retryInterval/1000}秒后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            } catch (error) {
                logger.log("获取验证码出错: " + error, 'error');
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            }
        }

        throw new Error(`经过 ${maxRetries} 次尝试后仍未获取到验证码。`);
    }

    // 自动填写邮箱并提交
    async function fillEmail() {
        const email = generateEmail();
        logger.log('使用邮箱: ' + email);

        const emailInput = await waitForElement('input[name="username"]');
        if (!emailInput) {
            logger.log('未找到邮箱输入框', 'error');
            return false;
        }

        logger.log('找到邮箱输入框，开始填写');

        // 填写邮箱
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        continueBtn.click();
        return true;
    }

    // 填写验证码
    async function fillVerificationCode() {
        const code = await getVerificationCode();
        if (!code) {
            logger.log('未能获取验证码', 'error');
            return false;
        }

        const codeInput = await waitForElement('input[name="code"]');
        if (!codeInput) {
            logger.log('未找到验证码输入框', 'error');
            return false;
        }

        // 填写验证码
        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 点击继续按钮
        const continueBtn = await waitForElement('button[type="submit"]');
        if (!continueBtn) {
            logger.log('未找到继续按钮', 'error');
            return false;
        }

        continueBtn.click();
        return true;
    }

    // 同意服务条款并完成注册
    async function completeRegistration() {
        const checkbox = await waitForElement('input[type="checkbox"]');
        if (checkbox) {
            checkbox.click();
        }

        const signupBtn = await waitForElement('button:contains("Sign up")');
        if (!signupBtn) {
            logger.log('未找到注册按钮', 'error');
            return false;
        }

        signupBtn.click();
        return true;
    }

    // 主函数
    async function main() {
        // 只在注册页面运行
        if (!window.location.href.includes('login.augmentcode.com')) {
            return;
        }

        logger.log('开始自动注册流程...');

        // 检查当前页面状态
        const emailInput = document.querySelector('input[name="username"]');
        const codeInput = document.querySelector('input[name="code"]');
        const termsCheckbox = document.querySelector('#terms-of-service-checkbox');

        if (emailInput) {
            logger.log('检测到邮箱输入页面');
            // 显示注册按钮
            const registerButton = logger.showRegisterButton();
            if (registerButton) {
                registerButton.addEventListener('click', async () => {
                    try {
                        registerButton.disabled = true;
                        registerButton.textContent = '正在填写邮箱...';
                        if (await fillEmail()) {
                            logger.log('邮箱填写完成，请等待页面跳转到验证码输入...', 'success');
                        }
                    } catch (error) {
                        logger.log('填写邮箱过程出错: ' + error, 'error');
                        registerButton.disabled = false;
                        registerButton.textContent = '重试自动注册';
                    }
                });
            }
        } else if (codeInput) {
            logger.log('检测到验证码输入页面，自动执行验证码填写...');
            try {
                if (await fillVerificationCode()) {
                    logger.log('验证码填写完成，完成注册...', 'success');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    if (await completeRegistration()) {
                        logger.log('注册流程完成！', 'success');
                    }
                }
            } catch (error) {
                logger.log('填写验证码过程出错: ' + error, 'error');
            }
        } else if (termsCheckbox) {
            logger.log('检测到服务条款页面，自动勾选同意框...');
            try {
                if (!termsCheckbox.checked) {
                    termsCheckbox.click();
                    logger.log('已自动勾选服务条款同意框', 'success');
                }
                
                // 查找并点击注册按钮
                const signupBtn = await waitForElement('button[type="submit"]');
                if (signupBtn) {
                    signupBtn.click();
                    logger.log('点击注册按钮完成', 'success');
                }
            } catch (error) {
                logger.log('勾选服务条款过程出错: ' + error, 'error');
            }
        } else {
            logger.log('无法识别当前页面状态', 'warning');
        }
    }

    // 启动脚本
    main().catch(error => logger.log('脚本启动出错: ' + error, 'error'));
})(); 