// API配置
const API_KEY = 'sk-eohmnlhgsmbrcpzsszttehxtnpjtopadifmnanrcvvvbesfc';  // 实际使用时应该从环境变量获取
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// DOM元素
const englishNameInput = document.getElementById('englishName');
const generateBtn = document.getElementById('generateBtn');
const loadingElement = document.getElementById('loading');
const resultsElement = document.getElementById('results');

// 生成名字的提示词
const generatePrompt = (englishName) => {
    return `你是一位精通中国传统文化的起名大师。请为英文名"${englishName}"生成3个富有中国文化特色的中文名。

要求：
1. 名字要富有诗意，体现中国传统文化的优雅
2. 名字要朗朗上口，适合日常使用
3. 字义要积极向上
4. 音韵要和谐

请按下面的固定格式输出每个名字（注意每个标题后面的冒号）：

第一个名字
中文名字：
拼音：
字义解释：
文化内涵：
英文含义：

第二个名字
中文名字：
拼音：
字义解释：
文化内涵：
英文含义：

第三个名字
中文名字：
拼音：
字义解释：
文化内涵：
英文含义：`;
};

// 调用API生成名字
async function generateNames(englishName) {
    try {
        const requestBody = {
            model: "Pro/deepseek-ai/DeepSeek-R1",
            messages: [
                {
                    role: "user",
                    content: generatePrompt(englishName)
                }
            ],
            temperature: 0.5, // 降低创造性，加快响应
            max_tokens: 500, // 减少输出长度
            stream: true, // 开启流式响应
            top_p: 0.5, // 减少采样范围
            top_k: 20, // 减少考虑的词数
            frequency_penalty: 0.3, // 降低重复惩罚
            n: 1,
            response_format: {
                type: "text"
            }
        };

        console.log('发送请求:', {
            url: API_URL,
            body: requestBody
        });

        let responseContent = '';
        
        try {
            const controller = new AbortController();
            // 将超时时间临时延长到60秒，便于排查慢响应问题
            const timeout = setTimeout(() => controller.abort(), 60000); // 60秒超时

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-eohmnlhgsmbrcpzsszttehxtnpjtopadifmnanrcvvvbesfc`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout); // 清除超时计时器

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                alert('API请求失败：' + response.status + ' ' + response.statusText + '\n' + errorText);
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0] && data.choices[0].message) {
                                responseContent += data.choices[0].message.content;
                                // 更新UI显示部分内容
                                displayPartialResult(responseContent);
                            }
                        } catch (e) {
                            console.warn('解析流数据错误:', e);
                        }
                    }
                }
            }

            console.log('API响应完成:', responseContent);
            const data = { choices: [{ message: { content: responseContent } }] };

            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                console.error('API响应格式错误:', data);
                alert('API响应格式错误，请联系管理员！');
                throw new Error('API响应格式错误');
            }

            return data;
        } catch (error) {
            console.error('API调用错误:', error);
            if (error.name === 'AbortError') {
                alert('请求超时（60秒），请检查网络或稍后重试。');
            } else {
                alert('API调用出错：' + (error.message || error));
            }
            throw error;
        }

        // 将API返回的文本内容解析为名字对象数组
        const content = data.choices[0].message.content;
        console.log('API返回的原始内容:', content);
        
        // 创建结果对象
        const result = {
            names: []
        };
        
        // 将文本分成多个名字部分
        console.log('开始处理文本:', content);
        
        // 按“第”字分割成多个名字块
        const nameBlocks = content.split(/第[^第]+个名字/).filter(block => block.trim());
        console.log('分割后的名字块:', nameBlocks);
        
        // 解析每个名字块
        nameBlocks.forEach((block, index) => {
            console.log(`处理第${index + 1}个名字块:`, block);
            if (!block.trim()) return;
            
            const nameObj = {
                chinese: '',
                pinyin: '',
                meaning_cn: '',
                meaning_en: '',
                cultural_elements: ''
            };
            
            // 使用正则表达式提取各个部分
            const chineseMatch = block.match(/中文名字：([^\n]+)/);
            const pinyinMatch = block.match(/拼音：([^\n]+)/);
            const meaningMatch = block.match(/字义解释：([^\n]+)/);
            const cultureMatch = block.match(/文化内涵：([^\n]+)/);
            const englishMatch = block.match(/英文含义：([^\n]+)/);

            if (chineseMatch) nameObj.chinese = chineseMatch[1].trim();
            if (pinyinMatch) nameObj.pinyin = pinyinMatch[1].trim();
            if (meaningMatch) nameObj.meaning_cn = meaningMatch[1].trim();
            if (cultureMatch) nameObj.cultural_elements = cultureMatch[1].trim();
            if (englishMatch) nameObj.meaning_en = englishMatch[1].trim();
            
            // 如果解析到了中文名，就添加到结果中
            if (nameObj.chinese) {
                result.names.push(nameObj);
            }
        });
        
        // 如果没有解析到任何名字，添加一个默认响应
        if (result.names.length === 0) {
            result.names.push({
                chinese: '未能解析',
                pinyin: 'wei neng jie xi',
                meaning_cn: '抱歉，无法解析AI的回答',
                meaning_en: 'Sorry, could not parse AI response',
                cultural_elements: '暂无'
            });
        }
        
        console.log('处理后的结果:', result);
        return result;
    } catch (error) {
        console.error('生成名字时出错:', error);
        throw error;
    }
}

// 展示结果
function displayResults(names) {
    resultsElement.innerHTML = names.map(name => `
        <div class="name-card">
            <h2>${name.chinese} <span style="font-size: 0.8em">${name.pinyin}</span></h2>
            <div class="meaning">
                <p><strong>中文含义：</strong>${name.meaning_cn}</p>
                <p><strong>English Meaning：</strong>${name.meaning_en}</p>
                <p><strong>文化元素：</strong>${name.cultural_elements}</p>
            </div>
        </div>
    `).join('');
}

// 事件处理
generateBtn.addEventListener('click', async () => {
    const englishName = englishNameInput.value.trim();
    
    if (!englishName) {
        alert('请输入英文名！');
        return;
    }

    // 显示加载动画
    loadingElement.style.display = 'block';
    resultsElement.innerHTML = '';
    generateBtn.disabled = true;

    try {
        const result = await generateNames(englishName);
        displayResults(result.names);
    } catch (error) {
        alert(`生成名字时出错：${error.message}`);
    } finally {
        // 隐藏加载动画
        loadingElement.style.display = 'none';
        generateBtn.disabled = false;
    }
});
