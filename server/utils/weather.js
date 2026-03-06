const crypto = require('crypto');

const WEATHER_API_HOST = process.env.HEFENG_WEATHER_API_HOST;
const WEATHER_API_KEY = process.env.HEFENG_WEATHER_API_KEY;

// const GEO_API_URL = 'https://geoapi.qweather.com/v2/city/lookup';
const GEO_API_URL = `${WEATHER_API_HOST}/geo/v2/city/lookup`;

/**
 * 构建 URL 查询参数
 * @param {Object} params - 参数对象
 * @returns {string}
 */
function buildQueryString(params) {
	return Object.entries(params)
		.map(
			([key, value]) =>
				`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
		)
		.join('&');
}

/**
 * 解析相对日期关键词
 * @param {string} dateStr - 日期字符串（如：今天、明天、today 等）
 * @returns {Object|null} - 返回相对天数偏移，无法解析返回 null
 */
function parseRelativeDate(dateStr) {
	if (!dateStr) return null;

	const normalized = dateStr.toLowerCase().trim();

	if (normalized === '今天' || normalized === '今日') {
		return { offset: 0 };
	}
	if (normalized === '昨天' || normalized === '昨日') {
		return { offset: -1 };
	}
	if (normalized === '明天' || normalized === '明日') {
		return { offset: 1 };
	}
	if (normalized === '后天' || normalized === '后日') {
		return { offset: 2 };
	}
	if (normalized === '大后天' || normalized === '大后日') {
		return { offset: 3 };
	}
	if (normalized === '前天' || normalized === '前日') {
		return { offset: -2 };
	}
	if (normalized === '大前天' || normalized === '大前日') {
		return { offset: -3 };
	}

	if (normalized === 'today') {
		return { offset: 0 };
	}
	if (normalized === 'yesterday') {
		return { offset: -1 };
	}
	if (normalized === 'tomorrow') {
		return { offset: 1 };
	}
	if (normalized === 'day after tomorrow') {
		return { offset: 2 };
	}
	if (normalized === 'day before yesterday') {
		return { offset: -2 };
	}

	return null;
}

/**
 * 格式化日期为 YYYYMMDD
 * @param {Date} date - Date 对象
 * @returns {string}
 */
function formatDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

/**
 * 根据相对偏移计算日期
 * @param {number} offset - 相对今天的天数偏移（正数=未来，负数=过去）
 * @returns {string} - 格式：YYYYMMDD
 */
function getDateByOffset(offset) {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	return formatDate(date);
}

/**
 * 解析任意日期字符串
 * @param {string} dateStr - 日期字符串（支持：今天、明天、today、YYYY-MM-DD、YYYYMMDD 等）
 * @returns {string} - 格式：YYYYMMDD
 */
function parseDate(dateStr) {
	if (!dateStr) {
		throw new Error('日期不能为空');
	}

	const relative = parseRelativeDate(dateStr);
	if (relative) {
		return getDateByOffset(relative.offset);
	}

	if (/^\d{8}$/.test(dateStr)) {
		return dateStr;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr.replace(/-/g, '');
	}

	const parsed = new Date(dateStr);
	if (!isNaN(parsed.getTime())) {
		return formatDate(parsed);
	}

	throw new Error(`无法解析的日期格式：${dateStr}`);
}

/**
 * 根据城市名称获取地理位置 ID
 * @param {string} location - 城市名称（中文或英文）
 * @returns {Promise<{ id: string, name: string, lat: string, lon: string }>}
 */
async function getGeoId(location) {
	if (!location || location.trim() === '') {
		throw new Error('城市名称不能为空');
	}

	const params = {
		location,
		key: WEATHER_API_KEY,
	};

	const url = `${WEATHER_API_HOST}/geo/v2/city/lookup?${buildQueryString(params)}`;

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

		if (data.code !== '200') {
			throw new Error(`和风天气 API 错误：${data.code}`);
		}

		if (!data.location || data.location.length === 0) {
			throw new Error(`未找到城市：${location}`);
		}

		const city = data.location[0];
		return {
			id: city.id,
			name: city.name,
			lat: city.lat,
			lon: city.lon,
		};
	} catch (error) {
		console.error('获取城市信息失败：', error.message);
		if (error.name === 'AbortError') {
			throw new Error('和风天气 API 请求超时');
		}
		if (error.message.startsWith('HTTP 错误')) {
			throw error;
		}
		throw new Error(`获取城市信息失败：${error.message}`);
	}
}

/**
 * 获取天气预报（1-7 天）
 * @param {string} location - 城市名称或城市 ID
 * @param {Object} options - 查询选项
 * @param {number} [options.days=3] - 预报天数（1-7）
 * @returns {Promise<{
 *   forecasts: Array<{
 *     fxDate: string,
 *     sunrise: string,
 *     sunset: string,
 *     moonrise: string,
 *     moonset: string,
 *     moonPhase: string,
 *     moonPhaseIcon: string,
 *     tempMax: string,
 *     tempMin: string,
 *     iconDay: string,
 *     textDay: string,
 *     iconNight: string,
 *     textNight: string,
 *     windDir: string,
 *     windScaleDay: string,
 *     windScaleNight: string,
 *     windSpeedDay: string,
 *     windSpeedNight: string,
 *     uvIndex: string,
 *     humidity: string,
 *     precip: string,
 *     pressure: string,
 *     vis: string,
 *     cloud: string,
 *   }>,
 *   location: { id: string, name: string, lat: string, lon: string }
 * }>}
 */
async function getForecast(location, options = {}) {
	const { days = 3 } = options;

	if (!location || location.trim() === '') {
		throw new Error('城市名称不能为空');
	}

	if (![3, 7, 10, 15, 30].includes(days)) {
		throw new Error('天数参数错误，只支持 3、7、10、15、30天');
	}

	let cityId = location;

	if (!/^\d+$/.test(location)) {
		const geoResult = await getGeoId(location);
		cityId = geoResult.id;
	}

	const params = {
		location: cityId,
		key: WEATHER_API_KEY,
	};

	const url = `${WEATHER_API_HOST}/v7/weather/${days}d?${buildQueryString(params)}`;

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

		if (data.code !== '200') {
			throw new Error(`和风天气 API 错误：${data.code}`);
		}

		if (!data.daily || data.daily.length === 0) {
			throw new Error('天气预报数据为空');
		}

		return {
			forecasts: data.daily,
			location: {
				id: data.fxLink?.id || '',
				name: data.fxLink?.name || '',
				lat: data.fxLink?.lat || '',
				lon: data.fxLink?.lon || '',
			},
		};
	} catch (error) {
		console.error('获取天气预报失败：', error.message);
		if (error.name === 'AbortError') {
			throw new Error('和风天气 API 请求超时');
		}
		if (error.message.startsWith('HTTP 错误')) {
			throw error;
		}
		throw new Error(`获取天气预报失败：${error.message}`);
	}
}

/**
 * 获取未来指定日期的天气预报
 * @param {string} location - 城市名称或城市 ID
 * @param {string} date - 日期（支持：明天、后天、tomorrow、day after tomorrow、YYYY-MM-DD、YYYYMMDD）
 * @returns {Promise<string>} - 返回天气描述字符串
 */
async function getWeather(location, date) {
	let targetDate;

	try {
		targetDate = parseDate(date);
	} catch (error) {
		throw new Error(`日期解析错误：${error.message}`);
	}

	const today = new Date();
	const target = new Date(
		`${targetDate.slice(0, 4)}-${targetDate.slice(4, 6)}-${targetDate.slice(6, 8)}`,
	);

	const diffTime = target.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		throw new Error('只支持查询未来日期');
	}

	if (diffDays > 30) {
		throw new Error('只支持查询未来 30 天内的天气');
	}

	try {
		const weathers = await getForecast(location, { days: 30 });

		const targetWeather = weathers.forecasts.find((forecast) => {
			const forecastDate = forecast.fxDate.replace(/-/g, '');
			return forecastDate === targetDate;
		});

		if (!targetWeather) {
			throw new Error(`未找到 ${targetDate} 的天气预报数据`);
		}

		const result = `📍 ${location}（${targetDate}）天气：${targetWeather.textDay}，气温 ${targetWeather.tempMin}°C ~ ${targetWeather.tempMax}°C`;
		console.log('天气查询成功:', result);
		return result;
	} catch (error) {
		console.error('获取未来天气失败：', error.message);
		throw new Error(`获取未来天气失败：${error.message}`);
	}
}

module.exports = {
	getGeoId,
	getForecast,
	getWeather,
};
