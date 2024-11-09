import { Timer } from './timer.js';
import { UI } from './ui.js';
import { handleError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const timer = new Timer();
        const ui = new UI(timer);

        // 设置回调函数
        timer.updateDisplay = ui.updateDisplay.bind(ui);
        timer.onComplete = ui.onTimerComplete.bind(ui);

        // 初始化显示
        ui.loadRecords();
        ui.updateHistoryStats();
        ui.loadTemplates();
    } catch (error) {
        handleError('应用初始化失败', error);
    }
});
