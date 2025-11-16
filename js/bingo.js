// 使用 jQuery 的 document ready 确保 DOM 元素存在时才执行脚本
$(function() {
    
    const BINGO_STORAGE_KEY = 'aiBingoData';
    // 确保与 timer.js 中的常量保持一致，用于读取 Key
    const API_KEY_STORAGE_KEY = 'geminiApiKey'; 
    const NUM_CELLS = 25; // 5x5 BINGO 板

    let bingoData = {
        title: '',
        cells: Array(NUM_CELLS).fill({ text: '点击 AI 生成', completed: false }),
    };
    
    // 使用 jQuery 获取 DOM 元素
    const $bingoSettingsMenu = $('#bingo-settings-menu'); 
    const $bingoFab = $('#bingo-fab');
    
    const $generateBtn = $('#generateBtn');
    const $saveBtn = $('#saveBtn');
    const $bingoBoard = $('#bingoBoard');
    const $statusMessage = $('#statusMessage');
    const $bingoTitleInput = $('#bingoTitleInput');
    const $promptInput = $('#promptInput');
    
    // *** MODIFIED: 移除了 $apiKeyInput 和 $saveApiKeyBtn 的引用 ***

    // 1. 数据加载与保存
    function saveBingoData() {
        localStorage.setItem(BINGO_STORAGE_KEY, JSON.stringify(bingoData));
    }

    function loadBingoData() {
        const saved = localStorage.getItem(BINGO_STORAGE_KEY);
        if (saved) {
            try {
                bingoData = JSON.parse(saved);
                if (!Array.isArray(bingoData.cells) || bingoData.cells.length !== NUM_CELLS) {
                     bingoData.cells = Array(NUM_CELLS).fill({ text: '点击 AI 生成', completed: false });
                }
            } catch (e) {
                console.error("Failed to parse BINGO data:", e);
                bingoData.cells = Array(NUM_CELLS).fill({ text: '点击 AI 生成', completed: false });
            }
        }
        
        // *** MODIFIED: 移除了 API Key UI 初始化逻辑 ***
        $bingoTitleInput.val(bingoData.title || '');
        renderBingoBoard();
        checkWinCondition();
    }

    // 2. 渲染 BINGO 板
    function renderBingoBoard() {
        $bingoBoard.empty();
        bingoData.cells.forEach((cell, index) => {
            const $cellDiv = $('<div>')
                .addClass('bingo-cell')
                .toggleClass('completed', cell.completed)
                .text(cell.text)
                .attr('data-index', index);

            $cellDiv.on('click', function() {
                if (cell.text !== '点击 AI 生成' && cell.text !== 'FREE') { 
                    toggleCell(index);
                }
            });

            $bingoBoard.append($cellDiv);
        });
    }

    // 3. 单元格状态切换
    function toggleCell(index) {
        const cell = bingoData.cells[index];
        cell.completed = !cell.completed;
        $bingoBoard.find(`.bingo-cell[data-index="${index}"]`).toggleClass('completed', cell.completed);

        saveBingoData();
        checkWinCondition();
    }

    // 4. BINGO 获胜条件检查
    function checkWinCondition() {
        const completed = bingoData.cells.map(cell => cell.completed);
        let isWin = false;
        const size = 5;

        // 检查行
        for (let i = 0; i < size; i++) {
            if (completed.slice(i * size, (i + 1) * size).every(c => c)) { isWin = true; break; }
        }
        // 检查列
        if (!isWin) {
            for (let j = 0; j < size; j++) {
                if ([...Array(size).keys()].every(i => completed[i * size + j])) { isWin = true; break; }
            }
        }
        // 检查对角线 1 (0, 6, 12, 18, 24)
        if (!isWin && [...Array(size).keys()].every(i => completed[i * size + i])) { isWin = true; }
        // 检查对角线 2 (4, 8, 12, 16, 20)
        if (!isWin && [...Array(size).keys()].every(i => completed[i * size + (size - 1 - i)])) { isWin = true; }


        if (isWin) {
            $bingoBoard.addClass('bingo-win');
            showMessage('BINGO! 恭喜达成！', 'success');
        } else {
            $bingoBoard.removeClass('bingo-win');
            // 如果没有获胜，并且状态消息不是胜利消息，则在延迟后隐藏
            if(!$statusMessage.hasClass('success') && $statusMessage.is(':visible')) {
                 $statusMessage.delay(5000).fadeOut(300);
            }
        }
    }

    // 5. AI 生成内容 (MODIFIED: Reads API Key from localStorage)
    async function generateBingoContent() {
        // *** MODIFIED: 从 localStorage 读取 Key ***
        const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY); 
        if (!apiKey) {
            showMessage('请先在全局设置中保存您的 Gemini API Key。', 'error');
            return;
        }

        const prompt = $promptInput.val().trim();
        if (!prompt) {
            showMessage('请输入 AI 生成提示词。', 'error');
            return;
        }

        $generateBtn.prop('disabled', true).text('正在生成...');
        showMessage('正在联系 AI 生成 BINGO 内容，请稍候...', 'info');

        const model = 'gemini-2.5-flash';
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const systemInstruction = `你是一位创意 BINGO 生成器。用户会给你一个主题或提示词。你需要根据这个提示词，生成一个包含 ${NUM_CELLS} 个不重复、有趣且相关的项目的 JSON 数组。
        你的回复必须仅包含一个符合 JSON 格式的字符串，格式为: ["项目1", "项目2", ..., "项目25"]。
        不要包含任何解释性文字或 markdown 标记。`;
        
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `系统指令: ${systemInstruction}\n\n提示词: ${prompt}` }]
                }
            ]
        };

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                console.error('API 响应错误详情:', responseData);
                throw new Error(`API 调用失败: ${responseData.error?.message || response.statusText}`);
            }

            const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                throw new Error('AI 返回的内容为空或结构异常。');
            }

            let bingoItems;
            try {
                // 尝试清理 JSON 格式 (移除 markdown 标记)
                let cleanText = rawText.replace(/```json\s*|```/g, '').trim();
                bingoItems = JSON.parse(cleanText);
            } catch (e) {
                console.error('JSON 解析错误，原始文本：', rawText);
                throw new Error('AI 返回的内容格式不正确，无法解析为 JSON 数组。');
            }

            if (!Array.isArray(bingoItems) || bingoItems.length < NUM_CELLS) {
                throw new Error(`AI 返回的数组数量不足 ${NUM_CELLS} 个。请重试或修改提示词。`);
            }

            // 更新 BINGO 数据
            bingoData.title = $bingoTitleInput.val().trim() || 'AI 生成 BINGO';
            bingoData.cells = bingoItems.slice(0, NUM_CELLS).map(text => ({
                text: text,
                completed: false
            }));
            
            renderBingoBoard();
            saveBingoData();
            showMessage('BINGO 内容生成成功！请点击格子开始游戏。', 'success');

        } catch (error) {
            console.error('Gemini API 错误:', error);
            showMessage(`生成失败: ${error.message}`, 'error'); 
        } finally {
            $generateBtn.prop('disabled', false).text('使用 AI 生成 BINGO');
        }
    }

    /**
     * 6. 状态消息显示
     */
    function showMessage(message, type) {
        $statusMessage.text(message).removeClass().addClass(type).fadeIn(300);
        if (!$bingoBoard.hasClass('bingo-win')) {
            $statusMessage.delay(5000).fadeOut(300);
        }
    }

    // 7. 事件监听器

    // BINGO FAB 按钮点击事件
    $bingoFab.on('click', function() {
        $bingoSettingsMenu.slideToggle(300);
        // 关闭全局设置菜单以保持界面整洁
        $('#global-settings-menu').slideUp(300); 
    });

    $generateBtn.on('click', generateBingoContent);

    $saveBtn.on('click', function() {
        bingoData.title = $bingoTitleInput.val().trim() || 'AI 生成 BINGO';
        saveBingoData();
        showMessage('BINGO 进度和标题已保存。', 'success');
    });
    
    // *** MODIFIED: 移除了 $saveApiKeyBtn.on('click', ...) 事件监听器 ***
    
    // 初始化加载数据
    loadBingoData();
});