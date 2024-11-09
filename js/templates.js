import { loadUserTemplates } from './storage.js';

export const DEFAULT_TEMPLATES = [
    {
        id: 'standard',
        name: '标准番茄钟',
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        numberOfPomodoros: 4,
        enableLongBreak: true,
    },
    {
        id: 'easy',
        name: '轻松背单词',
        focusDuration: 15,
        shortBreakDuration: 3,
        longBreakDuration: 5,
        numberOfPomodoros: 4,
        enableLongBreak: true,
    },
    // 可以添加更多默认模板
];

export function loadTemplates() {
    const userTemplates = loadUserTemplates();
    const templates = DEFAULT_TEMPLATES.map(template => ({ ...template, isDefault: true }))
        .concat(userTemplates.map(template => ({ ...template, isDefault: false })));
    return templates;
}
