$(function() {
    
    // ----------------------------------------------------------------
    // 1. 全局常量、变量和颜色工具函数
    // ----------------------------------------------------------------
    const $clocksContainer = $('#clocks-container');
    const STORAGE_KEY = 'myCountdownClocks_v3'; 
    const WALLPAPER_KEY = 'currentWallpaper';
    const WALLPAPER_TYPE_KEY = 'wallpaperType'; 
    const GLOBAL_SETTINGS_KEY = 'globalSettings';
    
    let globalSettings = {
        fabColorMode: 'default',
        timeNumberColor: '#FFFFFF',
        progressBarColor: '#4CAF50',
        settingsFabColor: generateRandomColor() 
    };

    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 255, 255];
    }
    
    function calculateLuminance(hex) {
        const rgb = hexToRgb(hex);
        // 使用标准的 ITU-R BT.709 公式
        return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]);
    }

    function getAdaptiveTextColor(backgroundColorHex) {
        const luminance = calculateLuminance(backgroundColorHex);
        return luminance > 150 ? '#000000' : '#FFFFFF';
    }

    function generateRandomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    }

    // ----------------------------------------------------------------
    // 2. 壁纸和默认标题颜色逻辑 
    // ----------------------------------------------------------------
    
    function getAdaptiveDefaultTitleColor() {
        return '#FFFFFF'; 
    }
    
    /**
     * 更新壁纸 FAB 按钮的可见性
     */
    function updateWallpaperFabVisibility() {
        const type = localStorage.getItem(WALLPAPER_TYPE_KEY);
        // 只有在当前是“随机壁纸”类型或有本地壁纸保存时，才显示切换按钮
        const localUrl = localStorage.getItem('savedLocalWallpaper');
        if (type === 'random' || localUrl) {
            $('#wallpaper-btn').css('display', 'flex'); 
        } else {
            $('#wallpaper-btn').css('display', 'none');
        }
    }

    /**
     * 设置随机背景图
     */
    function setRandomBackground() {
        let rand = Math.floor(Math.random() * 4050);
        let randIm = "https://wallpaper.infinitynewtab.com/wallpaper/" + rand + ".jpg";
        document.body.style.backgroundImage = "url(" + randIm + ")";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundPosition = "center center"; 
        
        // 只保存当前的随机URL和类型
        localStorage.setItem(WALLPAPER_KEY, randIm);
        localStorage.setItem(WALLPAPER_TYPE_KEY, 'random');
        updateWallpaperFabVisibility(); 
    }

    /**
     * 设置本地背景图 (接受 URL 或 DataURL)
     */
    function setLocalBackground(url) {
        document.body.style.backgroundImage = "url(" + url + ")";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundPosition = "center center";

        // 将本地图片的 dataURL 永久存储在一个单独的 key 中，以便切换回本地壁纸
        if (url.startsWith('data:')) {
            localStorage.setItem('savedLocalWallpaper', url);
        }
        
        localStorage.setItem(WALLPAPER_KEY, url);
        localStorage.setItem(WALLPAPER_TYPE_KEY, 'local');
        updateWallpaperFabVisibility(); 
    }
    
    /**
     * 根据存储加载壁纸
     */
    function loadWallpaper() {
        const type = localStorage.getItem(WALLPAPER_TYPE_KEY);
        const url = localStorage.getItem(WALLPAPER_KEY);
        const localUrl = localStorage.getItem('savedLocalWallpaper');

        if (type === 'local' && url) {
            setLocalBackground(url);
        } else if (localUrl) {
            // 如果上次是随机，但有本地图片存储，也要更新FAB可见性
            updateWallpaperFabVisibility(); 
            setRandomBackground();
        } else {
            setRandomBackground();
        }
    }
    
    /**
     * 切换壁纸 (随机/本地)
     */
    function toggleWallpaper() {
        const type = localStorage.getItem(WALLPAPER_TYPE_KEY);
        const localUrl = localStorage.getItem('savedLocalWallpaper'); 

        // 如果当前是随机壁纸且有本地存储，则切换到本地
        if (type === 'random' && localUrl) {
             setLocalBackground(localUrl);
        } else {
             // 否则，重新加载一张新的随机图片
             setRandomBackground();
        }
    }


    // ----------------------------------------------------------------
    // 3. 全局设置存储和应用逻辑 
    // ----------------------------------------------------------------

    function loadGlobalSettings() {
        const storedSettings = localStorage.getItem(GLOBAL_SETTINGS_KEY);
        if (storedSettings) {
            globalSettings = { 
                ...globalSettings, 
                ...JSON.parse(storedSettings) 
            };
            globalSettings.settingsFabColor = generateRandomColor();
        }
    }

    function saveGlobalSettings() {
        const settingsToStore = {
            fabColorMode: globalSettings.fabColorMode,
            timeNumberColor: globalSettings.timeNumberColor,
            progressBarColor: globalSettings.progressBarColor
        };
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settingsToStore));
        applyGlobalSettings(); 
        updateAllClocks(); // 确保时钟上的时间数字颜色立刻更新
    }

    /**
     * 应用全局设置到所有相关 DOM 元素
     */
    function applyGlobalSettings() {
        // 1. 设置 FAB 按钮颜色 (随机)
        $('#settings-fab').css('background-color', globalSettings.settingsFabColor);

        // 2. 应用全局数字颜色
        const timeColor = globalSettings.timeNumberColor.toUpperCase();
        $('.clock-instance .time-l').css('color', timeColor);
        $('#time-number-color').val(timeColor);
        $('#time-number-color-text').val(timeColor);

        // 3. 应用全局进度条颜色
        const progressBarColor = globalSettings.progressBarColor.toUpperCase();
        const rgb = hexToRgb(progressBarColor);
        const gradientColor1 = progressBarColor;
        const gradientColor2 = `rgb(${Math.min(255, rgb[0] + 50)}, ${Math.min(255, rgb[1] + 50)}, ${Math.min(255, rgb[2] + 50)})`;

        const gradientStyle = `linear-gradient(90deg, ${gradientColor1}, ${gradientColor2})`;
        $('.progress-bar-inner').css('background', gradientStyle);
        $('#progress-bar-color').val(progressBarColor);
        $('#progress-bar-color-text').val(progressBarColor);
        
        // 4. 应用悬浮球颜色模式
        $('#fab-color-mode').val(globalSettings.fabColorMode);
        updateMinimizedFabColors();
    }
    
    /**
     * 根据全局模式更新所有最小化悬浮球的颜色和文字颜色
     */
    function updateMinimizedFabColors() {
        $('.minimized-clock-btn').each(function() {
            const $fab = $(this);
            const clockId = $fab.data('id');
            // 注意：这里需要通过 ID 找到卡片，即使它当前是隐藏的
            const $clock = $(`#clocks-container .clock-instance[data-id="${clockId}"]`);
            let bgColor;
            let textColor;
            let isCompleted = $clock.hasClass('completed');

            switch (globalSettings.fabColorMode) {
                case 'random':
                    if (!$fab.data('random-color')) {
                         $fab.data('random-color', generateRandomColor());
                    }
                    bgColor = $fab.data('random-color'); 
                    textColor = getAdaptiveTextColor(bgColor);
                    $fab.css({ 'background': bgColor, 'color': textColor });
                    // 完成状态的描边使用 CSS 覆盖，这里只需要处理非完成状态的边框
                    if (!isCompleted) $fab.css('border', 'none'); 
                    break;

                case 'title':
                    // 确保能读取到当前标题颜色，即使卡片被最小化
                    const titleColor = $clock.find('.clock-title-color').val() || $clock.find('.clock-title').css('color') || '#FFFFFF';
                    bgColor = titleColor;
                    textColor = getAdaptiveTextColor(bgColor);
                    $fab.css({ 'background': bgColor, 'color': textColor });
                    if (!isCompleted) $fab.css('border', '1px solid rgba(255, 255, 255, 0.3)'); 
                    break;

                case 'default':
                default:
                    bgColor = 'rgba(0, 0, 0, 0.4)';
                    textColor = '#FFFFFF';
                    $fab.css({ 'background': bgColor, 'color': textColor });
                    if (!isCompleted) $fab.css('border', '1px solid rgba(255, 255, 255, 0.3)'); 
                    break;
            }
            
            // 确保文字颜色应用于内部 span
             $fab.find('.min-title, .min-percent').css('color', textColor);
        });
    }

    // ----------------------------------------------------------------
    // 4. 存储、渲染和添加逻辑 
    // ----------------------------------------------------------------
    
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function loadClocksFromStorage() {
        const clocksJson = localStorage.getItem(STORAGE_KEY);
        let clocks = clocksJson ? JSON.parse(clocksJson) : [];

        const defaultStart = formatDateForInput(new Date());
        const defaultEnd = formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); 

        return clocks.map(clock => ({
            id: clock.id,
            title: clock.title || "新倒计时",
            startDate: clock.startDate || defaultStart,
            targetDate: clock.targetDate || defaultEnd,
            isMinimized: clock.isMinimized || false,
            top: clock.top || 'auto',
            left: clock.left || 'auto',
            titleColor: clock.titleColor || getAdaptiveDefaultTitleColor()
        }));
    }

    /**
     * 修复：重新实现 saveClocksToStorage，确保正确获取位置和最小化状态
     */
    function saveClocksToStorage() {
        const clocksData = [];
        $('.clock-instance').each(function() {
            const $clock = $(this);
            const clockId = $clock.data('id');
            const $minimizedFab = $(`#fab-container .minimized-clock-btn[data-id="${clockId}"]`);

            // 判断是否最小化：检查最小化 FAB 是否可见
            const isMinimized = $minimizedFab.css('display') === 'flex'; 
            
            // 获取位置
            let top = 'auto';
            let left = 'auto';
            if ($clock.css('position') === 'absolute') {
                top = $clock.css('top');
                left = $clock.css('left');
            }

            const clockData = {
                id: clockId,
                title: $clock.find('.clock-title').text().trim(), 
                startDate: $clock.find('.clock-start-date').val(),
                targetDate: $clock.find('.clock-target-date').val(),
                isMinimized: isMinimized, 
                top: top, 
                left: left,
                titleColor: $clock.find('.clock-title-color').val() || $clock.find('.clock-title').css('color')
            };
            clocksData.push(clockData);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clocksData));
        updateMinimizedFabColors(); 
    }

    /**
     * 将时钟数据渲染到页面
     */
    function renderClock(clockData) {
        let initialDisplay = clockData.isMinimized ? 'none' : 'block'; 
        let initialPosition = '';

        if (!clockData.isMinimized && clockData.top && clockData.left && clockData.top !== 'auto' && clockData.left !== 'auto') {
            initialPosition = `position: absolute; top: ${clockData.top}; left: ${clockData.left};`;
        } 
        
        // 渲染时钟卡片
        const clockHtml = `
            <div class="clock-instance" data-id="${clockData.id}" style="display: ${initialDisplay}; ${initialPosition}">
                
                <div class="clock-header">
                    <div 
                        class="clock-title" 
                        contenteditable="true" 
                        spellcheck="false"
                        style="color: ${clockData.titleColor || '#fff'};"
                    >${clockData.title}</div>
                    
                    <div class="clock-header-buttons">
                        <button class="minimize-toggle-btn" title="最小化/恢复">_</button>
                        <button class="settings-toggle-btn" title="显示/隐藏设置">
                            <span class="arrow-down">▼</span>
                            <span class="arrow-up" style="display:none;">▲</span>
                        </button>
                        <button class="delete-clock-btn" title="删除这个倒计时">×</button>
                    </div>
                </div>
                
                <div class="clock-settings" style="display: none;">
                    
                    <div class="title-color-group">
                        <label>标题颜色：</label>
                        <div class="color-controls">
                             <button class="reset-title-color-btn" title="恢复默认颜色 (白色)">默认颜色</button>
                             <input 
                                type="color" 
                                class="clock-title-color" 
                                value="${clockData.titleColor || '#ffffff'}"
                             >
                        </div>
                    </div>

                    <label>开始时间：
                        <input 
                            type="datetime-local" 
                            class="clock-start-date" 
                            value="${clockData.startDate || ''}"
                        >
                    </label>
                    <label>目标时间：
                        <input 
                            type="datetime-local" 
                            class="clock-target-date" 
                            value="${clockData.targetDate || ''}"
                        >
                    </label>
                </div>

                <div class="time-box">
                    <ul class="clearfix">
                        <li><span class="time-l time-d" style="color:${globalSettings.timeNumberColor};">0</span><span class="time-s">天</span></li>
                        <li><span class="time-l time-h" style="color:${globalSettings.timeNumberColor};">00</span><span class="time-s">时</span></li>
                        <li><span class="time-l time-m" style="color:${globalSettings.timeNumberColor};">00</span><span class="time-s">分</span></li>
                        <li><span class="time-l time-sec" style="color:${globalSettings.timeNumberColor};">00</span><span class="time-s">秒</span></li>
                    </ul>
                </div>

                <div class="progress-bar-container" title="进度百分比">
                    <div class="progress-bar-inner"></div>
                    <span class="progress-percent-text">0.00%</span>
                </div>

            </div>
        `;
        const $newClock = $(clockHtml);
        $clocksContainer.append($newClock);
        
        // 生成并添加最小化 FAB 按钮
        const $minimizedFab = $(`
            <button 
                class="minimized-clock-btn" 
                data-id="${clockData.id}"
                title="${clockData.title} 进度"
                style="display: ${clockData.isMinimized ? 'flex' : 'none'};" 
            >
                <span class="min-title">${clockData.title}</span>
                <span class="min-percent">0.00%</span>
            </button>
        `);
        // 插入到设置按钮之前
        $minimizedFab.insertBefore($('#settings-fab')); 
        
        // 激活新添加时钟的拖动功能
        $newClock.draggable({
            handle: ".clock-header",
            cancel: ".clock-title, .clock-header-buttons button", 
            containment: "window",
            start: function() {
                // 拖动开始时，将元素从流式布局（如果它是相对定位）改为绝对定位
                $(this).css('position', 'absolute'); 
            },
            stop: saveClocksToStorage // 拖动停止时保存位置
        });
        
        updateClock($newClock);
    }

    /**
     * 专用的添加新时钟函数
     */
    function addNewClock() {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const newClock = {
            id: Date.now(),
            title: "新倒计时 (点击编辑)",
            startDate: formatDateForInput(now),
            targetDate: formatDateForInput(oneWeekFromNow),
            isMinimized: false,
            top: 'auto',
            left: 'auto',
            titleColor: getAdaptiveDefaultTitleColor() 
        };
        renderClock(newClock);
        saveClocksToStorage();
    }
    
    // ... (updateClock, updateAllClocks, calculateTimeParts 函数)
    
    function updateClock($clock) {
         const nowTS = Date.now() / 1000; 
         const clockId = $clock.data('id');
         const startDateStr = $clock.find('.clock-start-date').val();
         const targetDateStr = $clock.find('.clock-target-date').val();
         const $minimizedFab = $(`#fab-container .minimized-clock-btn[data-id="${clockId}"]`);
         const timeColor = globalSettings.timeNumberColor.toUpperCase(); 

         let percentageText = 'N/A';
         let timestamp = 0; 
         let isCompleted = false;

         if (targetDateStr) {
             const targetTS = Date.parse(new Date(targetDateStr)) / 1000;
             timestamp = targetTS - nowTS;

             if (timestamp <= 0) {
                 timestamp = 0;
                 isCompleted = true;
             }

             if (startDateStr) {
                 const startTS = Date.parse(new Date(startDateStr)) / 1000;
                 const totalDuration = targetTS - startTS;
                 const elapsedDuration = nowTS - startTS;
                 let percentage;

                 if (totalDuration <= 0 || targetTS < startTS) {
                     percentage = 0;
                 } else if (elapsedDuration >= totalDuration) {
                     percentage = 100;
                 } else {
                     percentage = Math.max(0, (elapsedDuration / totalDuration) * 100);
                 }
                 percentageText = percentage.toFixed(2) + '%';
             }
         }
            
         const timeParts = calculateTimeParts(timestamp);

         // 应用全局数字颜色
         $clock.find('.time-l').css('color', timeColor);
         $clock.find('.time-d').text(timeParts.totalDays);
         $clock.find('.time-h').text(timeParts.hour);
         $clock.find('.time-m').text(timeParts.minute);
         $clock.find('.time-sec').text(timeParts.second);

         $clock.find('.progress-bar-inner').css('width', percentageText);
         $clock.find('.progress-percent-text').text(percentageText);
            
         if ($minimizedFab.length) {
             $minimizedFab.find('.min-percent').text(percentageText);
             $minimizedFab.find('.min-title').text($clock.find('.clock-title').text().trim());
             $minimizedFab.attr('title', $clock.find('.clock-title').text().trim() + ' 进度');
         }

         // ★★★ 计时完成状态处理 ★★★
         if (isCompleted) {
             // 1. 卡片和 FAB 添加完成类和动画类
             $clock.addClass('completed');
             if ($minimizedFab.length) {
                 // 确保悬浮球只有在可见时才闪烁
                 if ($minimizedFab.css('display') === 'flex') {
                    $minimizedFab.addClass('completed bounce animated');
                 } else {
                    $minimizedFab.addClass('completed');
                 }
             }
         } else {
             // 2. 移除类
             $clock.removeClass('completed');
             if ($minimizedFab.length) {
                 $minimizedFab.removeClass('completed bounce animated');
             }
         }
    }


    function updateAllClocks() {
        $('.clock-instance').each(function() {
            updateClock($(this));
        });
    }

    function calculateTimeParts(timestamp) {
         let totalSeconds = Math.max(0, Math.floor(timestamp));
         const totalDays = Math.floor(totalSeconds / (24 * 3600));
         totalSeconds %= (24 * 3600);
         const hour = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
         totalSeconds %= 3600;
         const minute = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
         const second = String(totalSeconds % 60).padStart(2, '0');
         return { totalDays, hour, minute, second };
    }

    // ----------------------------------------------------------------
    // 5. 事件绑定 (最小化、删除、设置)
    // ----------------------------------------------------------------

    // 添加新时钟
    $('#add-clock-btn').off('click').on('click', addNewClock);

    // 删除按钮
    $clocksContainer.on('click', '.delete-clock-btn', function() {
        const $clock = $(this).closest('.clock-instance');
        const clockId = $clock.data('id');

        $clock.fadeOut(200, function() {
            $(this).remove();
            // 移除对应的 FAB 
            $(`#fab-container .minimized-clock-btn[data-id="${clockId}"]`).remove();
            saveClocksToStorage();
        });
    });

    // 最小化按钮
    $clocksContainer.on('click', '.minimize-toggle-btn', function() {
        const $clock = $(this).closest('.clock-instance');
        const clockId = $clock.data('id');
        const $minimizedFab = $(`#fab-container .minimized-clock-btn[data-id="${clockId}"]`);

        $clock.fadeOut(300, function() {
             $minimizedFab.css('display', 'flex'); 
             saveClocksToStorage(); 
             if ($clock.hasClass('completed')) {
                 $minimizedFab.addClass('bounce animated');
             }
        });
    });
    
    // 最小化 FAB 点击 (恢复)
    $('#fab-container').on('click', '.minimized-clock-btn', function() {
        const $minimizedFab = $(this);
        const clockId = $minimizedFab.data('id');
        const $clock = $(`#clocks-container .clock-instance[data-id="${clockId}"]`);

        $minimizedFab.hide().removeClass('bounce animated'); 
        
        $clock.fadeIn(300, function() { 
            const currentPosition = $clock.css('position');
            
            // 如果卡片在默认位置，恢复到流式布局，否则保持绝对定位
            if (currentPosition !== 'absolute' || ($clock.css('top') === '0px' && $clock.css('left') === '0px')) {
                 $clock.css({'position': 'relative', 'left': 'auto', 'top': 'auto'}); 
            } 
            saveClocksToStorage(); 
        });
    });

    // 单个时钟设置菜单切换
    $clocksContainer.on('click', '.settings-toggle-btn', function() {
        const $this = $(this);
        const $settings = $this.closest('.clock-instance').find('.clock-settings');
        
        $settings.slideToggle(200);
        $this.find('.arrow-down').toggle();
        $this.find('.arrow-up').toggle();
    });

    // 单个时钟颜色设置和输入自动保存
    $clocksContainer.on('input blur', '.clock-title, .clock-start-date, .clock-target-date, .clock-title-color', function() {
        const $this = $(this);
        if ($this.hasClass('clock-title-color')) {
             // 颜色输入改变时，立即更新标题预览颜色
             const newColor = $this.val();
             $this.closest('.clock-instance').find('.clock-title').css('color', newColor);
             updateMinimizedFabColors(); // 立即更新 FAB 颜色
        }
        
        if ($this[0].saveTimer) {
            clearTimeout($this[0].saveTimer);
        }
        $this[0].saveTimer = setTimeout(() => {
            saveClocksToStorage();
        }, 500); 
    });
    
    // 重置标题颜色为默认白色
    $clocksContainer.on('click', '.reset-title-color-btn', function() {
         const $clock = $(this).closest('.clock-instance');
         $clock.find('.clock-title-color').val('#FFFFFF');
         $clock.find('.clock-title').css('color', '#FFFFFF');
         saveClocksToStorage();
    });
    
    // ★★★ 全局设置菜单事件绑定 (修复内容) ★★★

    $('#settings-fab').on('click', function() {
        $('#global-settings-menu').slideToggle(200);
    });

    // 1. FAB 颜色模式切换
    $('#fab-color-mode').on('change', function() {
        globalSettings.fabColorMode = $(this).val();
        saveGlobalSettings(); 
    });

    // 2. 全局数字颜色选择器
    $('#time-number-color').on('input', function() {
        const newColor = $(this).val().toUpperCase();
        globalSettings.timeNumberColor = newColor;
        $('#time-number-color-text').val(newColor);
        saveGlobalSettings();
    });
    
    // 3. 全局进度条颜色选择器
    $('#progress-bar-color').on('input', function() {
        const newColor = $(this).val().toUpperCase();
        globalSettings.progressBarColor = newColor;
        $('#progress-bar-color-text').val(newColor);
        saveGlobalSettings();
    });
    
    // 4. 导入本地壁纸按钮
    $('#import-local-wallpaper-btn').on('click', function() {
        $('#local-wallpaper-input').trigger('click');
    });

    // 5. 本地壁纸文件选择
    $('#local-wallpaper-input').on('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // 使用 DataURL 设置和存储壁纸
                setLocalBackground(e.target.result); 
            };
            reader.readAsDataURL(file);
        }
    });

    // 6. 清除本地壁纸按钮
    $('#clear-local-wallpaper-btn').on('click', function() {
        // 1. 清除本地存储的图片 URL
        localStorage.removeItem('savedLocalWallpaper');
        // 2. 切换回随机壁纸
        setRandomBackground();
    });
    
    // 7. 随机/本地壁纸切换按钮
    $('#wallpaper-btn').on('click', toggleWallpaper);


    // ----------------------------------------------------------------
    // 6. 初始化 
    // ----------------------------------------------------------------

    (function init() {
        loadWallpaper(); 
        loadGlobalSettings();
        applyGlobalSettings(); 

        const initialClocks = loadClocksFromStorage();
        
        if (initialClocks.length > 0) {
            initialClocks.forEach(clockData => {
                renderClock(clockData);
            });
        } else {
            // 如果没有保存的时钟，则添加一个默认时钟
            addNewClock(); 
        }
        
        updateMinimizedFabColors();

        setInterval(updateAllClocks, 1000);
        updateAllClocks(); 
    })();

});