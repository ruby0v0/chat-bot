const ENDPOINT = process.env.LLM_ENDPOINT;
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;
const TIMEOUT = process.env.LLM_TIMEOUT;

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

async function callLLM(messages, tools = null, cb) {
	const params = {
		model: MODEL,
		messages,
		stream: true,
	};

	if (tools) {
		params.tools = tools;
	}

	try {
		const response = await request(ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
			},
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			throw new Error(
				`模型请求失败: [${response.status}] ${response.statusText}`,
			);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');
		let answer = '';
		let toolCalls = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split('\n').filter((line) => line.trim());

			for (const line of lines) {
				const raw = line.slice(6);

				if (!line.startsWith('data:')) {
					continue;
				}

				if (raw === '[DONE]') {
					break;
				}

				try {
					const data = JSON.parse(raw);
					const delta = data.choices?.[0]?.delta;

					if (delta?.content) {
						// 如果增量中包含内容信息
						answer += delta?.content;
						cb?.(delta?.content);
					} else if (delta?.tool_calls) {
						// 如果增量中包含工具调用信息
						for (const toolCall of delta.tool_calls) {
							const tool = toolCalls.find((t) => t.index === toolCall.index);
							// 如果是新的工具调用，则添加到 toolCalls 中
							if (!tool) {
								toolCalls.push({
									index: toolCall.index,
									id: toolCall.id,
									type: toolCall.type,
									function: {
										name: toolCall.function.name,
										arguments: toolCall.function.arguments,
									},
								});
							} else {
								// 如果后续流中同一个工具调用的 function.name 有增量更新，则进行覆盖
								if (toolCall.function?.name) {
									tool.function.name = toolCall.function.name;
								}
								// 如果后续流中同一个工具调用的 arguments 有增量更新，则进行合并
								if (toolCall.function?.arguments) {
									tool.function.arguments += toolCall.function.arguments;
								}
							}
						}
					}
				} catch (error) {
					console.error('JSON 解析失败：', error.message);
				}
			}
		}

		if (toolCalls.length > 0) {
			return {
				content: answer,
				tool_calls: toolCalls,
			};
		}

		return answer;
	} catch (error) {
		console.error('Error:', error);
	}
}

module.exports = {
	callLLM,
};
