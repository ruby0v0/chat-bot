const crypto = require('crypto');

const BAIDU_TRANSLATE_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

/**
 * 生成 MD5 签名
 * @param {string} text - 待翻译文本
 * @param {string} salt - 随机盐值
 * @returns {string}
 */
function generateSign(text, salt) {
	const signStr = `${process.env.BAIDU_TRANSLATE_APP_ID}${text}${salt}${process.env.BAIDU_TRANSLATE_SECRET_KEY}`;
	return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * 构建 URL 查询参数
 * @param {Object} params - 参数对象
 * @returns {string}
 */
function buildQueryString(params) {
	return Object.entries(params)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		.join('&');
}

/**
 * 翻译文本
 * @param {string} text - 待翻译的文本
 * @param {Object} options - 翻译选项
 * @param {string} [options.from='auto'] - 源语言
 * @param {string} [options.to='zh'] - 目标语言
 * @returns {Promise<{ translatedText: string, from: string, to: string }>}
 */
async function translate(text, options = {}) {
	const { from = 'auto', to = 'zh' } = options;

	if (!text || text.trim() === '') {
		throw new Error('待翻译文本不能为空');
	}

	const salt = Date.now().toString();
	const sign = generateSign(text, salt);

	const params = {
		q: text,
		from,
		to,
		appid: process.env.BAIDU_TRANSLATE_APP_ID,
		salt,
		sign,
	};

	const url = `${BAIDU_TRANSLATE_URL}?${buildQueryString(params)}`;

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP 错误：${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		if (data.error_code) {
			const error = new Error(
				`百度翻译 API 错误：${data.error_msg} (code: ${data.error_code})`,
			);
			error.code = data.error_code;
			throw error;
		}

		if (!data.trans_result || !Array.isArray(data.trans_result)) {
			throw new Error('翻译结果为空');
		}

		const translatedText = data.trans_result.map((item) => item.dst).join('\n');

		return {
			translatedText,
			from: data.from,
			to: data.to,
		};
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('百度翻译 API 请求超时');
		}
		if (error.message.startsWith('HTTP 错误')) {
			throw error;
		}
		throw new Error(`翻译失败：${error.message}`);
	}
}

/**
 * 检测语言并翻译
 * @param {string} text - 待翻译文本
 * @param {string} to - 目标语言
 * @returns {Promise<{ translatedText: string, detectedLanguage: string }>}
 */
async function autoTranslate(text, to = 'zh') {
	const result = await translate(text, { from: 'auto', to });
	return {
		translatedText: result.translatedText,
		detectedLanguage: result.from,
	};
}

module.exports = {
	translate,
	autoTranslate,
};