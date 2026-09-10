/**
 * Локальное тестирование БЕЗ Telegram
 * ⚠️ ТОЛЬКО для localhost:5173 - на продакшене скрывается!
 */

export function setupLocalDevMode() {
    // ✅ Показываем кнопку ТОЛЬКО на localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost) {
        console.log('✅ Production environment - Mock Login disabled');
        return;
    }

    // Проверяем есть ли Telegram SDK
    const hasTelegram = typeof window.Telegram !== 'undefined' &&
                       typeof window.Telegram.WebApp !== 'undefined' &&
                       window.Telegram.WebApp.initData;

    if (hasTelegram) {
        console.log('✅ Telegram Mini App detected - реальная авторизация');
        return;
    }

    console.log('%c🧪 LOCAL DEV MODE (localhost только!)', 'color: #ff00ff; font-size: 14px; font-weight: bold;');
    console.log('%cТипы тестирования:', 'color: #ffff00; font-weight: bold;');
    console.log('  • Нажми "🧪 Тест: Mock Login" для имитации авторизации');
    console.log('  • Локальная авторизация (БЕЗ Firebase)');
    console.log('  • Для реального тестирования используй Telegram Mini App');

    // Создаём кнопку Mock Login рядом с основной кнопкой авторизации
    const loginBtn = document.getElementById('login');
    if (loginBtn) {
        const mockBtn = document.createElement('button');
        mockBtn.id = 'mock-login';
        mockBtn.className = 'btn primary';
        mockBtn.style.marginTop = '10px';
        mockBtn.style.fontSize = '10px';
        mockBtn.style.width = '100%';
        mockBtn.innerText = '🧪 Тест: Mock Login';
        mockBtn.title = 'Только для локального тестирования (localhost)';

        loginBtn.parentElement.appendChild(mockBtn);

        mockBtn.addEventListener('click', async () => {
            mockBtn.disabled = true;
            mockBtn.innerText = '⏳ Загрузка...';

            try {
                const mockUser = createMockUser();

                // Сохраняем mock данные в localStorage
                localStorage.setItem('ludomania_mock_user', JSON.stringify(mockUser));
                localStorage.setItem('ludomania_mock_authed', 'true');

                console.log('✅ Mock авторизация сохранена в localStorage', mockUser);
                
                mockBtn.innerText = '✅ Авторизован!';
                
                // Перезагружаемся чтобы main.js обнаружил mock auth
                setTimeout(() => {
                    location.reload();
                }, 500);
            } catch (error) {
                console.error('Mock login error:', error);
                mockBtn.innerText = '❌ Ошибка';
                mockBtn.disabled = false;
            }
        });
    }
}

export function createMockUser() {
    const stored = localStorage.getItem('ludomania_mock_user');
    if (stored) {
        return JSON.parse(stored);
    }

    const mockUser = {
        id: Math.floor(Math.random() * 1000000000),
        first_name: 'Pixel',
        last_name: 'Tester',
        username: 'pixel_tester_' + Math.random().toString(36).substr(2, 9),
        language_code: 'ru',
        is_bot: false,
        is_premium: false,
        allows_write_to_pm: true
    };

    localStorage.setItem('ludomania_mock_user', JSON.stringify(mockUser));
    return mockUser;
}

export function getMockUser() {
    const stored = localStorage.getItem('ludomania_mock_user');
    return stored ? JSON.parse(stored) : null;
}

export function isMockAuthed() {
    return localStorage.getItem('ludomania_mock_authed') === 'true';
}

export function resetMockAuth() {
    localStorage.removeItem('ludomania_mock_user');
    localStorage.removeItem('ludomania_mock_authed');
    console.log('🔄 Mock авторизация сброшена');
    location.reload();
}

// Инициализируем при загрузке
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    setupLocalDevMode();
}

export default {
    setupLocalDevMode,
    createMockUser,
    getMockUser,
    isMockAuthed,
    resetMockAuth
};
