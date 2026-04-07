// src/calcom-config.js
require('dotenv').config();

const CALCOM_CONFIG = {
    apiKey: process.env.CALCOM_API_KEY,
    apiUrl: process.env.CALCOM_API_URL || 'https://api.cal.com/v1',
    eventTypeId: process.env.CALCOM_EVENT_TYPE_ID || null,
    userId: process.env.CALCOM_USER_ID || null,
    timezone: 'America/Sao_Paulo'
};

// Verificar configurações
if (!CALCOM_CONFIG.apiKey) {
    console.log('⚠️ CALCOM_API_KEY não configurada. O bot funcionará em modo simulado.');
}

module.exports = CALCOM_CONFIG;