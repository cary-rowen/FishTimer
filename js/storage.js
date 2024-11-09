import { handleError } from './utils.js';

export function saveRecord(record) {
    try {
        const records = JSON.parse(localStorage.getItem('pomodoroRecords') || '[]');
        records.unshift(record);
        if (records.length > 100) records.pop();
        localStorage.setItem('pomodoroRecords', JSON.stringify(records));
    } catch (error) {
        handleError('保存记录失败', error);
    }
}

export function loadRecords() {
    try {
        return JSON.parse(localStorage.getItem('pomodoroRecords') || '[]');
    } catch (error) {
        handleError('加载记录失败', error);
        return [];
    }
}

export function clearRecords() {
    try {
        localStorage.removeItem('pomodoroRecords');
    } catch (error) {
        handleError('清除记录失败', error);
    }
}

export function loadUserTemplates() {
    try {
        return JSON.parse(localStorage.getItem('userTemplates') || '[]');
    } catch (error) {
        handleError('加载用户模板失败', error);
        return [];
    }
}

export function saveUserTemplate(template) {
    try {
        const templates = loadUserTemplates();
        templates.push(template);
        localStorage.setItem('userTemplates', JSON.stringify(templates));
    } catch (error) {
        handleError('保存用户模板失败', error);
    }
}

export function deleteUserTemplate(templateId) {
    try {
        let templates = loadUserTemplates();
        templates = templates.filter(t => t.id !== templateId);
        localStorage.setItem('userTemplates', JSON.stringify(templates));
    } catch (error) {
        handleError('删除用户模板失败', error);
    }
}
