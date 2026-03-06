const ENDPOINT =
	process.env.LLM_ENDPOINT || 'http://localhost:11434/api/generate';
const MODEL = process.env.LLM_MODEL || 'llama3';
const TIMEOUT = process.env.LLM_TIMEOUT || 30_000;

async function request(url, options = {}) {
	const controller = new AbortController();
	const { timeout = TIMEOUT, ...restOpts } = options;

	const timer = setTimeout(() => {
		controller.abort();
	}, timeout);

	try {
		const response = await fetch(url, {
			...restOpts,
			signal: controller.signal,
		});
		clearTimeout(timer);
		return response;
	} catch (error) {
		clearTimeout(timer);
		if (error.name === 'AbortError') {
			throw new Error('请求超时，请稍后再试');
		}
		throw error;
	}
}

async function callLLM(prompt, stream = false, cb) {
	try {
		const raw = await request(ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: MODEL,
				prompt,
				stream,
			}),
		});

		if (!raw.ok) {
			throw new Error(`模型请求失败: [${raw.status}] ${raw.statusText}`);
		}

		if (!stream) {
			const data = await raw.json();
			return data.response;
		} else {
			const reader = raw.body.getReader();
			const decoder = new TextDecoder('utf-8');
			let answer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n').filter((line) => line.trim());

				for (const line of lines) {
					try {
						const data = JSON.parse(line);
						if (data.response) {
							answer += data.response;
							cb?.(data.response);
						}
					} catch (error) {
						console.error('JSON 解析失败：', error.message);
					}
				}
			}
			return answer;
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

module.exports = {
	callLLM,
};
