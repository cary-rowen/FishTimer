import { debounce, handleError } from './utils.js';
import { loadRecords, clearRecords, saveUserTemplate, deleteUserTemplate, saveRecord } from './storage.js';
import { STATUS_COMPLETED, STATUS_STOPPED, SESSION_TYPE } from './constants.js';
import { playAudioCue, AudioCueTypes} from './audioCues.js';
import { loadTemplates } from './templates.js';

export class UI {
    constructor(timer) {
        this.timer = timer;
        this.elements = {};
        this.isTimerVisible = true;
        this.currentSessionIndex = 0;
        this.sessionQueue = [];
        this.currentSession = null;
        this.cacheElements();
        this.addEventListeners();
        this.loadTemplates();

        this.timer.onComplete = this.onTimerComplete.bind(this);
        this.timer.updateDisplay = this.updateDisplay.bind(this);
    }

    cacheElements() {
        this.elements = {
            timerDisplay: document.getElementById('timer'),
            sessionNameDisplay: document.getElementById('sessionName'),
            sessionSubtextDisplay: document.getElementById('sessionSubtext'),
            pauseBtn: document.getElementById('pauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            recordsList: document.getElementById('recordsList'),
            viewHistoryBtn: document.getElementById('viewHistoryBtn'),
            backToMainBtn: document.getElementById('backToMainBtn'),
            mainView: document.getElementById('mainView'),
            historyView: document.getElementById('historyView'),
            totalSessionsElement: document.getElementById('totalSessions'),
            totalTimeElement: document.getElementById('totalTime'),
            completionRateElement: document.getElementById('completionRate'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            openWizardBtn: document.getElementById('openWizardBtn'),
            wizardModal: document.getElementById('wizardModal'),
            wizardForm: document.getElementById('wizardForm'),
            closeWizardBtn: document.getElementById('closeWizardBtn'),
            templatesTableBody: document.getElementById('templatesTableBody'),
            hideTimerCheckbox: document.getElementById('hideTimerCheckbox'),
            timerDisplaySection: document.getElementById('timerDisplaySection'),
            controls: document.querySelector('.controls'),
        };
    }

    addEventListeners() {
        this.elements.pauseBtn.addEventListener('click', this.pauseTimer.bind(this));
        this.elements.stopBtn.addEventListener('click', this.stopTimer.bind(this));
        this.elements.viewHistoryBtn.addEventListener('click', this.showHistoryView.bind(this));
        this.elements.backToMainBtn.addEventListener('click', this.showMainView.bind(this));
        this.elements.clearHistoryBtn.addEventListener('click', this.clearHistory.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        this.elements.openWizardBtn.addEventListener('click', this.openWizard.bind(this));
        this.elements.closeWizardBtn.addEventListener('click', this.closeWizard.bind(this));
        this.elements.wizardForm.addEventListener('submit', this.createSessionFromWizard.bind(this));
        this.elements.templatesTableBody.addEventListener('click', this.handleTemplateSelection.bind(this));

        this.elements.hideTimerCheckbox.addEventListener('change', this.toggleTimerVisibility.bind(this));
    }

    updateDisplay(timeLeft) {
        if (!this.isTimerVisible) return;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        this.elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    pauseTimer() {
        this.timer.pause();
        if (this.timer.isPaused) {
            this.elements.pauseBtn.textContent = '恢复';
            this.elements.pauseBtn.setAttribute('aria-label', '恢复计时');
        } else {
            this.elements.pauseBtn.textContent = '暂停';
            this.elements.pauseBtn.setAttribute('aria-label', '暂停计时');
        }
    }

    stopTimer() {
        if (confirm('确定要停止当前计时吗？')) {
            this.timer.stop();
            this.toggleButtons(false);
            this.showMainControls();
            this.isTimerVisible = true;
            this.updateTimerVisibility();

            const completedSessionIndex = this.currentSessionIndex - 1;
            if (completedSessionIndex >= 0 && completedSessionIndex < this.sessionQueue.length) {
                const completedSession = this.sessionQueue[completedSessionIndex];

                const record = {
                    taskName: completedSession.taskName || '未命名任务',
                    plannedDuration: completedSession.duration / 60,
                    actualTime: completedSession.duration - this.timer.timeLeft,
                    status: STATUS_STOPPED,
                    timestamp: Date.now(),
                };

                try {
                    saveRecord(record);
                } catch (error) {
                    handleError('保存记录失败', error);
                }
            }
        }
    }

    toggleButtons(isRunning) {
        this.elements.pauseBtn.classList.toggle('hidden', !isRunning);
        this.elements.stopBtn.classList.toggle('hidden', !isRunning);

        this.elements.pauseBtn.disabled = !isRunning;
        this.elements.stopBtn.disabled = !isRunning;
        this.elements.pauseBtn.textContent = '暂停';
        this.elements.pauseBtn.setAttribute('aria-label', '暂停计时');
    }

    showHistoryView() {
        this.elements.mainView.classList.add('hidden');
        this.elements.historyView.classList.remove('hidden');
        this.loadRecords();
        this.updateHistoryStats();
    }

    showMainView() {
        this.elements.historyView.classList.add('hidden');
        this.elements.mainView.classList.remove('hidden');
    }

    loadRecords() {
        try {
            const records = loadRecords();
            const fragment = document.createDocumentFragment();

            records.forEach(record => {
                const tr = document.createElement('tr');
                const date = new Date(record.timestamp);
                const formattedDate = date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                tr.innerHTML = `
                    <td><strong>${record.taskName}</strong></td>
                    <td>${record.plannedDuration}分钟</td>
                    <td>${Math.floor(record.actualTime / 60)}分钟${record.actualTime % 60}秒</td>
                    <td><span class="status-${record.status === STATUS_COMPLETED ? 'complete' : 'stopped'}">${record.status}</span></td>
                    <td>${formattedDate}</td>
                `;
                fragment.appendChild(tr);
            });

            this.elements.recordsList.innerHTML = '';
            this.elements.recordsList.appendChild(fragment);
        } catch (error) {
            handleError('加载历史记录失败', error);
        }
    }

    updateHistoryStats() {
        try {
            const records = loadRecords();
            const totalSessions = records.length;
            const totalTime = records.reduce((sum, record) => sum + record.actualTime, 0);
            const totalTimeInMinutes = totalTime / 60;
            const completedSessions = records.filter(record => record.status === STATUS_COMPLETED).length;
            const completionRate = totalSessions ? (completedSessions / totalSessions * 100).toFixed(2) : 0;

            this.elements.totalSessionsElement.textContent = totalSessions;
            this.elements.totalTimeElement.textContent = `${totalTimeInMinutes.toFixed(1)}分钟`;
            this.elements.completionRateElement.textContent = `${completionRate}%`;
        } catch (error) {
            handleError('更新统计信息失败', error);
        }
    }

    clearHistory() {
        if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
            try {
                clearRecords();
                this.elements.recordsList.innerHTML = '';
                this.updateHistoryStats();
            } catch (error) {
                handleError('清除历史记录失败', error);
            }
        }
    }

    handleKeydown(e) {
        if (e.code === 'Space' && !e.target.matches('input')) {
            e.preventDefault();
            if (this.timer.isRunning) {
                this.pauseTimer();
            }
        }
    }

    loadTemplates() {
        try {
            const templates = loadTemplates();
            const fragment = document.createDocumentFragment();

            templates.forEach(template => {
                const tr = document.createElement('tr');
                tr.dataset.templateId = template.id;

                tr.innerHTML = `
                    <td>${template.name}</td>
                    <td>${template.focusDuration}</td>
                    <td>${template.shortBreakDuration}</td>
                    <td>${template.enableLongBreak ? `${template.longBreakDuration}分钟` : '无'}</td>
                    <td>${template.numberOfPomodoros}</td>
                    <td>
                        <button class="start-template-btn">开始</button>
                        ${!template.isDefault ? '<button class="delete-template-btn">删除</button>' : ''}
                    </td>
                `;
                fragment.appendChild(tr);
            });

            this.elements.templatesTableBody.innerHTML = '';
            this.elements.templatesTableBody.appendChild(fragment);
        } catch (error) {
            handleError('加载模板失败', error);
        }
    }

    handleTemplateSelection(event) {
        const target = event.target;
        const tr = target.closest('tr');
        if (!tr) return;

        const templateId = tr.dataset.templateId;
        const templates = loadTemplates();
        const selectedTemplate = templates.find(t => t.id === templateId);

        if (target.classList.contains('start-template-btn')) {
            if (selectedTemplate) {
                this.startSessionSequence(selectedTemplate);
            }
        } else if (target.classList.contains('delete-template-btn')) {
            if (selectedTemplate) {
                if (confirm(`确定要删除模板 "${selectedTemplate.name}" 吗？`)) {
                    try {
                        deleteUserTemplate(templateId);
                        this.loadTemplates();
                    } catch (error) {
                        handleError('删除模板失败', error);
                    }
                }
            } else {
                handleError('未找到要删除的模板', new Error('模板不存在'));
            }
        }
    }

    openWizard() {
        this.elements.wizardModal.classList.remove('hidden');
    }

    closeWizard() {
        this.elements.wizardModal.classList.add('hidden');
        this.elements.wizardForm.reset();
    }

    createSessionFromWizard(event) {
        event.preventDefault();
        const formData = new FormData(this.elements.wizardForm);
        const longBreakDurationValue = formData.get('longBreakDuration');
        const enableLongBreak = longBreakDurationValue !== 'none';

        const template = {
            id: Date.now().toString(),
            name: formData.get('taskName') || '未命名任务',
            focusDuration: parseInt(formData.get('focusDuration'), 10),
            shortBreakDuration: parseInt(formData.get('shortBreakDuration'), 10),
            longBreakDuration: enableLongBreak ? parseInt(longBreakDurationValue, 10) : 0,
            numberOfPomodoros: parseInt(formData.get('numberOfPomodoros'), 10),
            enableLongBreak,
            isDefault: false,
        };

        if (formData.get('saveTemplate') === 'on') {
            try {
                saveUserTemplate(template);
                this.loadTemplates();
            } catch (error) {
                handleError('保存模板失败', error);
            }
        }

        this.closeWizard();
        this.startSessionSequence(template);
    }

    startSessionSequence(template) {
        this.sessionQueue = [];
        for (let i = 0; i < template.numberOfPomodoros; i++) {
            this.sessionQueue.push({
                type: SESSION_TYPE.FOCUS,
                duration: template.focusDuration * 60,
                taskName: template.name,
            });
            if (i < template.numberOfPomodoros - 1) {
                this.sessionQueue.push({
                    type: SESSION_TYPE.SHORT_BREAK,
                    duration: template.shortBreakDuration * 60,
                });
            }
        }

        if (template.enableLongBreak) {
            this.sessionQueue.push({
                type: SESSION_TYPE.LONG_BREAK,
                duration: template.longBreakDuration * 60,
            });
        }

        this.currentSessionIndex = 0;
        this.hideMainControls();
        this.isTimerVisible = true;
        this.updateTimerVisibility();
        this.startNextSession();
    }

    async startNextSession() {
        if (this.currentSessionIndex >= this.sessionQueue.length) {
            try {
                await playAudioCue(AudioCueTypes.COMPLETE_CYCLE);
            } catch (error) {
                handleError('播放完成循环音效失败', error);
                return;
            }

            this.updateDisplay(0);
            this.isTimerVisible = false;
            this.updateTimerVisibility();
            this.showMainControls();
            return;
        }

        const currentSession = this.sessionQueue[this.currentSessionIndex];
        this.currentSession = currentSession;

        let sessionName = '';
        let sessionSubtext = '';
        let audioCueType = '';

        if (currentSession.type === SESSION_TYPE.FOCUS) {
            sessionName = currentSession.taskName;
            sessionSubtext = '保持专注，完成你的任务！';
            audioCueType = AudioCueTypes.START_FOCUS;
        } else if (currentSession.type === SESSION_TYPE.SHORT_BREAK) {
            sessionName = '短休息';
            sessionSubtext = '稍作休息，准备下一个专注周期。';
            audioCueType = AudioCueTypes.START_SHORT_BREAK;
        } else if (currentSession.type === SESSION_TYPE.LONG_BREAK) {
            sessionName = '长休息';
            sessionSubtext = '好好休息，放松一下！';
            audioCueType = AudioCueTypes.START_LONG_BREAK;
        }

        this.elements.sessionNameDisplay.textContent = sessionName;
        this.elements.sessionSubtextDisplay.textContent = sessionSubtext;

        try {
            await playAudioCue(audioCueType);
        } catch (error) {
            handleError(`播放音效 "${audioCueType}" 失败`, error);
        }

        this.timer.start(sessionName, currentSession.duration / 60);
        this.toggleButtons(true);
        this.currentSessionIndex++;
    }

    async onTimerComplete() {
        this.toggleButtons(false);

        const completedSessionIndex = this.currentSessionIndex - 1;
        if (completedSessionIndex >= 0 && completedSessionIndex < this.sessionQueue.length) {
            const completedSession = this.sessionQueue[completedSessionIndex];

            const record = {
                taskName: completedSession.taskName || '未命名任务',
                plannedDuration: completedSession.duration / 60,
                actualTime: completedSession.duration,
                status: STATUS_COMPLETED,
                timestamp: Date.now(),
            };

            try {
                saveRecord(record);
            } catch (error) {
                handleError('保存记录失败', error);
            }
        } else {
            handleError('完成的会话索引超出范围，无法保存记录。', new Error('索引超出范围'));
        }

        if (this.currentSessionIndex >= this.sessionQueue.length) {
            try {
                await playAudioCue(AudioCueTypes.COMPLETE_CYCLE);
            } catch (error) {
                handleError('播放完成循环音效失败', error);
                return;
            }

            this.updateDisplay(0);
            this.isTimerVisible = false;
            this.updateTimerVisibility();
            this.showMainControls();
        } else {
            this.startNextSession();
        }
    }

    hideMainControls() {
        this.elements.openWizardBtn.classList.add('hidden');
        this.elements.viewHistoryBtn.classList.add('hidden');
        this.elements.templatesTableBody.parentElement.classList.add('hidden');
        this.elements.controls.classList.remove('hidden');
    }

    showMainControls() {
        this.elements.openWizardBtn.classList.remove('hidden');
        this.elements.viewHistoryBtn.classList.remove('hidden');
        this.elements.templatesTableBody.parentElement.classList.remove('hidden');
        this.elements.sessionNameDisplay.textContent = '';
        this.elements.sessionSubtextDisplay.textContent = '';
        this.elements.controls.classList.add('hidden');
    }

    updateTimerVisibility() {
        if (this.isTimerVisible) {
            this.elements.timerDisplaySection.classList.remove('hidden');
        } else {
            this.elements.timerDisplaySection.classList.add('hidden');
        }
    }

    toggleTimerVisibility() {
        this.isTimerVisible = !this.isTimerVisible;
        this.updateTimerVisibility();
    }
}
