var express = require('express');
var router = express.Router();
const { getWeather } = require('../utils/weather.js');
const { translate } = require('../utils/translate.js');
const tools = require('../utils/tools.js');
const { callLLM } = require('../utils/llm.js');

const conversations = [];

router.post('/ask', async (req, res) => {
	const { question = '' } = req.body;

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');

	const messages = [...conversations, { role: 'user', content: question }];

	try {
		const response = await callLLM(messages, tools, (data) => {
			res.write(`${JSON.stringify({ response: data })}\n`);
		});

		if (response.tool_calls && response.tool_calls.length > 0) {
			const toolResults = [];

			for (const tool of response.tool_calls) {
				try {
					const name = tool.function.name;
					const args = JSON.parse(tool.function.arguments || '{}');
					if (name === 'getWeather') {
						const { city, date } = args;
						const content = await getWeather(city, date);
						toolResults.push({
							tool_call_id: tool.id,
							role: 'tool',
							content,
						});
					} else if (name === 'translate') {
						const { input } = args;
						const content = await translate(input, {
							from: 'zh',
							to: 'en',
						});
						toolResults.push({
							tool_call_id: tool.id,
							role: 'tool',
							content,
						});
					} else {
						console.warn(`未知工具：${name}`);
						toolResults.push({
							tool_call_id: tool.id,
							role: 'tool',
							content: `未知工具：${name}`,
						});
					}
				} catch (error) {
					console.error('工具调用失败：', error);
					toolResults.push({
						tool_call_id: tool.id,
						role: 'tool',
						content: `工具调用失败：${error.message}`,
					});
				}
			}

			messages.push(
				{
					role: 'assistant',
					content: response.content,
					tool_calls: response.tool_calls,
				},
				...toolResults,
			);

			const result = await callLLM(messages, tools, (data) => {
				res.write(`${JSON.stringify({ response: data })}\n`);
			});

			conversations.push(
				{
					role: 'user',
					content: question,
				},
				// 函数调用
				{
					role: 'assistant',
					content: response.content,
					tool_calls: response.tool_calls,
				},
				// 函数调用结果
				...toolResults,
				// 最终回答
				{
					role: 'assistant',
					content: result,
				},
			);
		} else {
			conversations.push(
				{
					role: 'user',
					content: question,
				},
				{
					role: 'assistant',
					content: response,
				},
			);
		}

		if (conversations.length > 20) {
			conversations.splice(0, conversations.length - 20);
		}
	} catch (error) {
		console.error('工具获取失败', error);
	} finally {
		res.end();
	}
});

router.get('/history', (req, res) => {
	res.json({
		code: 200,
		message: '操作成功',
		data: conversations,
	});
});

router.post('/clear', (req, res) => {
	conversations.length = 0;
	res.json({
		code: 200,
		message: '操作成功',
		data: null,
	});
});

module.exports = router;
